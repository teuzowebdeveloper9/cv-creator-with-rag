from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from ai_services import DocumentProcessor, QdrantVectorStore, LLMOrchestrator
from .serializers import GenerateSerializer

class UploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        files = request.FILES.getlist('files')
        if not files:
            return Response({"error": "No files provided"}, status=status.HTTP_400_BAD_REQUEST)

        processor = DocumentProcessor()
        vector_store = QdrantVectorStore()
        
        total_chunks = 0
        for file in files:
            content = file.read()
            text = ""
            if file.name.endswith('.pdf'):
                text = processor.extract_from_pdf(content)
            elif file.name.endswith('.html'):
                text = processor.extract_from_html(content)
            else:
                continue
            
            chunks = processor.split_text(text)
            metadatas = [{"source": file.name} for _ in chunks]
            vector_store.upsert(collection_name="user_context", texts=chunks, metadatas=metadatas)
            total_chunks += len(chunks)

        return Response({"message": f"Successfully processed {len(files)} files into {total_chunks} chunks."}, status=status.HTTP_201_CREATED)

class GenerateView(APIView):
    def post(self, request):
        serializer = GenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        job_description = serializer.validated_data['job_description']
        
        vector_store = QdrantVectorStore()
        orchestrator = LLMOrchestrator()

        # 1. Retrieve relevant context
        context_fragments = vector_store.search(collection_name="user_context", query=job_description, limit=10)
        context_text = "\n---\n".join([f["text"] for f in context_fragments])

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

        # 3. Generate with Fallback
        try:
            cv_markdown = orchestrator.generate(prompt, system_prompt)
            return Response({"cv": cv_markdown}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
