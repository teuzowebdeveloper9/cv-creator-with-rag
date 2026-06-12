from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.parsers import MultiPartParser, FormParser
from ai_services import DocumentProcessor, QdrantVectorStore, LLMOrchestrator, PDFGenerator, BlobStorage
from ai_services.cv_markdown import CV_OUTPUT_RULES, sanitize_cv_markdown
from .serializers import GenerateSerializer, DocumentSerializer, UpdateCVSerializer
from .tasks import process_document_task
from .models import Document
import os
import base64
from django.http import StreamingHttpResponse, HttpResponse
import json
import datetime

class DownloadPDFView(APIView):
    def post(self, request):
        md_content = sanitize_cv_markdown(request.data.get('markdown', ''))
        if not md_content:
            return Response({"error": "Nenhum conteúdo fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pdf_bytes = PDFGenerator.generate(md_content)

            # Save to Blob Storage (MinIO)
            try:
                storage = BlobStorage()
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                file_name = f"cv_{timestamp}.pdf"
                storage.save_pdf(file_name, pdf_bytes)
            except Exception as blob_err:
                # Log error but don't stop the download
                print(f"Failed to save to blob: {str(blob_err)}")

            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = 'inline; filename="curriculo.pdf"'
            return response
        except Exception as e:
            return Response({"error": f"Erro ao gerar PDF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProviderStatusView(APIView):
    def get(self, request):
        orchestrator = LLMOrchestrator()
        status_data = {}
        for provider in orchestrator.providers:
            provider_name = provider.__class__.__name__.lower().replace('provider', '')
            status_data[provider_name] = provider.is_available()
        
        return Response(status_data, status=status.HTTP_200_OK)

class UploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        files = request.FILES.getlist('files')
        if not files:
            return Response({"error": "No files provided"}, status=status.HTTP_400_BAD_REQUEST)

        created_docs = []
        for file in files:
            content = file.read()
            content_b64 = base64.b64encode(content).decode('utf-8')
            
            doc = Document.objects.create(name=file.name, status='PENDING')
            process_document_task.delay(doc.id, content_b64)
            created_docs.append(doc.id)

        return Response({
            "message": f"Successfully queued {len(files)} files for processing.",
            "document_ids": created_docs
        }, status=status.HTTP_202_ACCEPTED)

class DocumentListView(generics.ListAPIView):
    queryset = Document.objects.all().order_by('-created_at')
    serializer_class = DocumentSerializer

def _collect_llm_response(orchestrator, prompt: str, system_prompt: str) -> str:
    return "".join(chunk for chunk in orchestrator.stream(prompt, system_prompt) if chunk)

class GenerateView(APIView):
    def post(self, request):
        serializer = GenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        job_description = serializer.validated_data['job_description']
        
        vector_store = QdrantVectorStore()
        orchestrator = LLMOrchestrator()

        # 0. Pre-check: Are there ANY available providers?
        available_providers = [p for p in orchestrator.providers if p.is_available()]
        if not available_providers:
            return Response(
                {"error": "Nenhum provedor de IA configurado ou disponível. Verifique suas chaves de API."}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # 1. Retrieve relevant context
        try:
            context_fragments = vector_store.search(collection_name="user_context", query=job_description, limit=10)
            context_text = "\n---\n".join([f["text"] for f in context_fragments])
        except Exception as e:
            return Response({"error": f"Erro ao buscar no banco vetorial: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Build Prompt
        system_prompt = f"""
        Voce e um especialista em recrutamento e selecao. Sua tarefa e gerar um curriculo altamente personalizado
        com base nas experiencias do usuario e na descricao da vaga fornecida.
        Use apenas as informacoes fornecidas no contexto do usuario.
        Se alguma informacao estiver ausente, omita essa informacao em vez de deixar lacunas ou placeholders.
        Formate o curriculo de forma profissional em Markdown.

        {CV_OUTPUT_RULES}
        """
        
        prompt = f"""
        Descrição da Vaga:
        {job_description}

        Contexto Relevante do Usuário:
        {context_text}

        Gere o currículo otimizado para esta vaga.
        """

        # 3. Generate the complete CV before streaming it, so we can enforce output hygiene.
        try:
            raw_content = _collect_llm_response(orchestrator, prompt, system_prompt)
            cv_content = sanitize_cv_markdown(raw_content)
            if not cv_content:
                raise Exception("A IA retornou uma resposta vazia.")
        except Exception as e:
            return Response({"error": f"Falha ao iniciar geração com IA: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Keep the SSE contract expected by the frontend.
        def stream_generator():
            yield f"data: {json.dumps({'chunk': cv_content})}\n\n"

        response = StreamingHttpResponse(stream_generator(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        return response

class UpdateCVView(APIView):
    def post(self, request):
        serializer = UpdateCVSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        current_cv = serializer.validated_data['current_cv']
        edit_instruction = serializer.validated_data['edit_instruction']
        job_description = serializer.validated_data.get('job_description', '')

        orchestrator = LLMOrchestrator()
        available_providers = [p for p in orchestrator.providers if p.is_available()]
        if not available_providers:
            return Response(
                {"error": "Nenhum provedor de IA configurado ou disponível. Verifique suas chaves de API."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        context_text = ""
        try:
            vector_store = QdrantVectorStore()
            query = "\n".join([job_description, edit_instruction]).strip()
            if query:
                context_fragments = vector_store.search(collection_name="user_context", query=query, limit=8)
                context_text = "\n---\n".join([fragment.get("text", "") for fragment in context_fragments])
        except Exception as e:
            print(f"Failed to load vector context for CV update: {str(e)}")

        system_prompt = f"""
        Voce e um editor senior de curriculos. Atualize o curriculo atual conforme o pedido do usuario.
        Preserve fatos, datas, cargos e informacoes ja existentes quando eles nao forem contraditos pelo pedido.
        Use o contexto recuperado apenas para complementar informacoes reais.
        Se o pedido exigir informacao que nao existe no curriculo nem no contexto, nao invente.
        Retorne sempre o curriculo completo atualizado, nao apenas o trecho alterado.

        {CV_OUTPUT_RULES}
        """

        prompt = f"""
        Pedido de edicao:
        {edit_instruction}

        Descricao da vaga original:
        {job_description}

        Contexto recuperado da base do usuario:
        {context_text}

        Curriculo atual em Markdown:
        {current_cv}

        Atualize e retorne o curriculo final completo.
        """

        try:
            raw_content = _collect_llm_response(orchestrator, prompt, system_prompt)
            updated_cv = sanitize_cv_markdown(raw_content)
            if not updated_cv:
                raise Exception("A IA retornou uma resposta vazia.")
            return Response({"markdown": updated_cv}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Falha ao atualizar CV com IA: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
