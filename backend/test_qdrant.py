#!/usr/bin/env python3
"""
Test script for Qdrant vector database.
Run: docker compose exec backend python test_qdrant.py
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny, Range
from sentence_transformers import SentenceTransformer

QDRANT_HOST = "qdrant"
QDRANT_PORT = 6333
COLLECTION = "user_context"

client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, check_compatibility=False)
encoder = SentenceTransformer("all-MiniLM-L6-v2")


def header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_list_collections():
    header("1. LISTAR COLLECTIONS")
    collections = client.get_collections()
    for c in collections.collections:
        print(f"  - {c.name}")


def test_collection_info():
    header("2. INFO DA COLLECTION")
    info = client.get_collection(COLLECTION)
    print(f"  Status:        {info.status}")
    print(f"  Points:        {info.points_count}")
    print(f"  Indexed:       {info.indexed_vectors_count}")
    print(f"  Segments:      {info.segments_count}")
    print(f"  Vector size:   {info.config.params.vectors.size}")
    print(f"  Distance:      {info.config.params.vectors.distance}")


def test_scroll_all():
    header("3. SCROLL - Primeiros 5 points com payload completo")
    result, _ = client.scroll(
        collection_name=COLLECTION,
        limit=5,
        with_payload=True,
    )
    for point in result:
        payload = point.payload
        text = payload.get("text", "")
        preview = (text[:100] + "...") if len(text) > 100 else text
        print(f"\n  [{point.id}]")
        for k, v in payload.items():
            if k == "text":
                print(f"    text: {preview}")
            else:
                print(f"    {k}: {v}")
    print(f"\n  Total returned: {len(result)}")


def test_scroll_by_chunk_index():
    header("4. SCROLL - Filtrar por chunk_index <= 2")
    result, _ = client.scroll(
        collection_name=COLLECTION,
        scroll_filter=Filter(
            must=[FieldCondition(key="chunk_index", range=Range(lte=2))]
        ),
        limit=10,
        with_payload=["document_name", "chunk_index", "chunk_total"],
    )
    for point in result:
        payload = point.payload
        print(f"  [{point.id}] chunk {payload.get('chunk_index', '?')}/{payload.get('chunk_total', '?')} doc={payload.get('document_name', '?')}")
    print(f"\n  Total: {len(result)}")


def test_scroll_by_source():
    header("5. SCROLL - Filtrar por source (primeiros 5)")
    result, _ = client.scroll(
        collection_name=COLLECTION,
        scroll_filter=Filter(
            must=[FieldCondition(key="source", match=MatchAny(any=["curriculo.pdf", "portfolio.html", "cv.pdf"]))]
        ),
        limit=10,
        with_payload=["source", "document_name", "chunk_index"],
    )
    if result:
        for point in result:
            payload = point.payload
            print(f"  [{point.id}] source={payload.get('source', '?')} doc={payload.get('document_name', '?')} chunk#{payload.get('chunk_index', '?')}")
    else:
        print("  Nenhum point encontrado com esses sources.")
        print("  Listando sources unicos...")
        all_sources = set()
        offset = None
        while True:
            pts, offset = client.scroll(
                collection_name=COLLECTION,
                limit=100,
                offset=offset,
                with_payload=["source"],
            )
            for p in pts:
                all_sources.add(p.payload.get("source", "unknown"))
            if offset is None:
                break
        for s in sorted(all_sources):
            print(f"    - {s}")
    print(f"\n  Total: {len(result)}")


def test_count():
    header("6. COUNT - Total de points")
    total = client.count(collection_name=COLLECTION)
    print(f"  Total points: {total.count}")

    filtered = client.count(
        collection_name=COLLECTION,
        count_filter=Filter(
            must=[FieldCondition(key="chunk_index", range=Range(lte=2))]
        )
    )
    print(f"  Points com chunk_index <= 2: {filtered.count}")


def test_semantic_search():
    header("7. BUSCA SEMANTICA - 'experiencia com Python'")
    query = "experiência com Python e machine learning"
    query_vector = encoder.encode(query).tolist()

    results = client.query_points(
        collection_name=COLLECTION,
        query=query_vector,
        limit=5,
        with_payload=["text", "source", "chunk_index"],
    )

    print(f'  Query: "{query}"\n')
    for i, hit in enumerate(results.points, 1):
        payload = hit.payload
        score = hit.score
        text = payload.get("text", "")
        preview = (text[:120] + "...") if len(text) > 120 else text
        print(f"  #{i} [score={score:.4f}] source={payload.get('source', '?')}")
        print(f"     {preview}\n")


def test_semantic_search_2():
    header("8. BUSCA SEMANTICA - 'gerenciamento de projetos'")
    query = "liderança e gerenciamento de projetos ágeis"
    query_vector = encoder.encode(query).tolist()

    results = client.query_points(
        collection_name=COLLECTION,
        query=query_vector,
        limit=5,
        with_payload=["text", "source", "chunk_index"],
    )

    print(f'  Query: "{query}"\n')
    for i, hit in enumerate(results.points, 1):
        payload = hit.payload
        score = hit.score
        text = payload.get("text", "")
        preview = (text[:120] + "...") if len(text) > 120 else text
        print(f"  #{i} [score={score:.4f}] source={payload.get('source', '?')}")
        print(f"     {preview}\n")


def test_semantic_search_3():
    header("9. BUSCA SEMANTICA - 'comunicacao e soft skills'")
    query = "comunicação, apresentação e trabalho em equipe"
    query_vector = encoder.encode(query).tolist()

    results = client.query_points(
        collection_name=COLLECTION,
        query=query_vector,
        limit=5,
        with_payload=["text", "source", "chunk_index"],
    )

    print(f'  Query: "{query}"\n')
    for i, hit in enumerate(results.points, 1):
        payload = hit.payload
        score = hit.score
        text = payload.get("text", "")
        preview = (text[:120] + "...") if len(text) > 120 else text
        print(f"  #{i} [score={score:.4f}] source={payload.get('source', '?')}")
        print(f"     {preview}\n")


def test_search_with_filter():
    header("10. BUSCA COM FILTRO - 'Django' so chunk <= 5")
    query = "desenvolvimento web com Django"
    query_vector = encoder.encode(query).tolist()

    results = client.query_points(
        collection_name=COLLECTION,
        query=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="chunk_index", range=Range(lte=5))]
        ),
        limit=5,
        with_payload=["text", "source", "chunk_index"],
    )

    print(f'  Query: "{query}" (chunk_index <= 5)\n')
    for i, hit in enumerate(results.points, 1):
        payload = hit.payload
        score = hit.score
        text = payload.get("text", "")
        preview = (text[:120] + "...") if len(text) > 120 else text
        print(f"  #{i} [score={score:.4f}] source={payload.get('source', '?')} chunk#{payload.get('chunk_index', '?')}")
        print(f"     {preview}\n")


def test_unique_sources():
    header("11. SOURCES UNICOS")
    all_sources = set()
    offset = None
    while True:
        result, offset = client.scroll(
            collection_name=COLLECTION,
            limit=100,
            offset=offset,
            with_payload=["source"],
        )
        for point in result:
            all_sources.add(point.payload.get("source", "unknown"))
        if offset is None:
            break

    print(f"  Total sources unicos: {len(all_sources)}")
    for s in sorted(all_sources):
        print(f"    - {s}")


def test_unique_documents():
    header("12. DOCUMENTOS UNICOS (document_name)")
    all_docs = set()
    offset = None
    while True:
        result, offset = client.scroll(
            collection_name=COLLECTION,
            limit=100,
            offset=offset,
            with_payload=["document_name"],
        )
        for point in result:
            all_docs.add(point.payload.get("document_name", "unknown"))
        if offset is None:
            break

    print(f"  Total documentos unicos: {len(all_docs)}")
    for d in sorted(all_docs):
        print(f"    - {d}")


def test_inspect_one_point():
    header("13. INSPECIONAR 1 POINT - Todos os campos")
    result, _ = client.scroll(
        collection_name=COLLECTION,
        limit=1,
        with_payload=True,
    )
    if result:
        point = result[0]
        print(f"  Point ID: {point.id}")
        print(f"  Payload ({len(point.payload)} campos):")
        for key, value in point.payload.items():
            val_str = str(value)[:150]
            print(f"    {key}: {val_str}")


def test_metadata_quality():
    header("14. QUALIDADE DO METADATA - Sample de 50 points")
    result, _ = client.scroll(
        collection_name=COLLECTION,
        limit=50,
        with_payload=True,
    )

    has_chunk_index = 0
    has_document_id = 0
    has_created_at = 0
    has_document_name = 0

    for point in result:
        payload = point.payload or {}
        if payload.get("chunk_index") is not None:
            has_chunk_index += 1
        if payload.get("document_id") is not None and payload.get("document_id") != 0:
            has_document_id += 1
        if payload.get("document_created_at"):
            has_created_at += 1
        if payload.get("document_name"):
            has_document_name += 1

    total = len(result)
    print(f"  Amostra: {total} points")
    print(f"  chunk_index:     {has_chunk_index}/{total} ({has_chunk_index*100//total}%)")
    print(f"  document_id:     {has_document_id}/{total} ({has_document_id*100//total}%)")
    print(f"  document_name:   {has_document_name}/{total} ({has_document_name*100//total}%)")
    print(f"  created_at:      {has_created_at}/{total} ({has_created_at*100//total}%)")

    if has_chunk_index == total:
        print(f"\n  Status: COMPLETO - todos os campos presentes")
    else:
        print(f"\n  Status: INCOMPLETO - execute reindex_qdrant.py para corrigir")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  QDRANT TEST SUITE - CV Generator RAG")
    print("="*60)

    try:
        test_list_collections()
        test_collection_info()
        test_scroll_all()
        test_scroll_by_chunk_index()
        test_scroll_by_source()
        test_count()
        test_semantic_search()
        test_semantic_search_2()
        test_semantic_search_3()
        test_search_with_filter()
        test_unique_sources()
        test_unique_documents()
        test_inspect_one_point()
        test_metadata_quality()

        header("TODOS OS TESTES CONCLUIDOS")
        print("  OK Conexao")
        test_list_collections()
        print("  OK Scroll com filtros")
        print("  OK Busca semantica")
        print("  OK Payload inspecionado")
        print()

    except Exception as e:
        print(f"\n  ERRO: {e}")
        raise
