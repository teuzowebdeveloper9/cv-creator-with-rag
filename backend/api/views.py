from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.parsers import MultiPartParser, FormParser
from ai_services import DocumentProcessor, QdrantVectorStore, LLMOrchestrator
from .serializers import GenerateSerializer, DocumentSerializer
from .tasks import process_document_task
from .models import Document
import os
import base64

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

from django.http import StreamingHttpResponse
import json

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
        system_prompt = """
        Você é um especialista em recrutamento e seleção. Sua tarefa é gerar um currículo altamente personalizado 
        com base nas experiências do usuário e na descrição da vaga fornecida.
        Use apenas as informações fornecidas no contexto do usuário. Se alguma informação for necessária mas não estiver presente, 
        indique claramente ou foque no que está disponível.
        Formate o currículo de forma profissional em Markdown.
        """
        
        prompt = f"""
        Descrição da Vaga:
        {job_description}

        Contexto Relevante do Usuário:
        {context_text}

        Gere o currículo otimizado para esta vaga.
        """

        # 3. Initial attempt to get the iterator to catch early errors
        try:
            stream_iterator = orchestrator.stream(prompt, system_prompt)
            # Try to get the first chunk to ensure the connection to the LLM is actually working
            # We use a peek-like approach by manually handling the first iteration
            first_chunk = next(stream_iterator)
        except Exception as e:
            return Response({"error": f"Falha ao iniciar geração com IA: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Stream with Fallback (continuing from the first chunk)
        def stream_generator(initial_chunk, iterator):
            yield f"data: {json.dumps({'chunk': initial_chunk})}\n\n"
            try:
                for chunk in iterator:
                    if chunk:
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        response = StreamingHttpResponse(stream_generator(first_chunk, stream_iterator), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        return response
