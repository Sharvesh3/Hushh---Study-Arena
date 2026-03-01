from modules.extractor import DocumentExtractor
from modules.cleaner import TextCleaner
from modules.chunker import SemanticChunker
from modules.vectordb import VectorDatabase
from modules.graph_builder import KnowledgeGraphBuilder
from modules.centrality import ConceptCentrality
from modules.question_generator import RAGQuestionGenerator
from modules.hallucination_guard import HallucinationGuard
from modules.difficulty_engine import DifficultyEngine
import os


if __name__ == "__main__":

    extractor = DocumentExtractor()
    cleaner = TextCleaner()
    chunker = SemanticChunker(similarity_threshold=0.65)
    vectordb = VectorDatabase()
    generator = RAGQuestionGenerator()
    guard = HallucinationGuard(threshold=0.60)
    engine = DifficultyEngine()

    file_path = "data/sample_notes.pdf"
    index_path = "vector.index"
    chunk_path = "chunks.pkl"

    if not os.path.exists(file_path):
        print("File not found.")
        exit()

    # ---------------------------------------------------
    # STEP 1: Check if Vector DB already exists
    # ---------------------------------------------------

    if os.path.exists(index_path) and os.path.exists(chunk_path):
        print("✔ Loading existing vector database...")
        vectordb.load(index_path, chunk_path)
    else:
        print("✔ No existing index found. Building new one...")

        # Step 1: Extract
        raw_text = extractor.extract(file_path)
        print("✔ Extraction Completed")

        # Step 2: Clean
        sentences = cleaner.process(raw_text)
        print("✔ Cleaning Completed")

        # Step 3: Chunk
        chunks = chunker.create_chunks(sentences)
        print("✔ Semantic Chunking Completed")

        # Step 4: Build Vector DB
        vectordb.build_index(chunks)
        vectordb.save(index_path, chunk_path)
        print("✔ FAISS Index Built & Saved")

    # ---------------------------------------------------
    # STEP 5: RAG Question Generation
    # ---------------------------------------------------

    query = "Explain supervised learning"
    retrieved_chunks = vectordb.retrieve(query, top_k=3)
    context_text = " ".join(retrieved_chunks)

    print("\n✔ Retrieved Context for Generation")

    mcqs = generator.generate(context_text)

    print("\nGenerated MCQs:\n")
    print(mcqs)

    # ---------------------------------------------------
    # STEP 6: Hallucination Guard
    # ---------------------------------------------------

    is_valid, score = guard.verify(mcqs, context_text)

    print("\n✔ Hallucination Check Completed")

    if isinstance(score, float):
        if is_valid:
            print(f"MCQs Accepted ✅ (Grounding Score: {round(score,2)})")
        else:
            print(f"MCQs Rejected ❌ (Grounding Score: {round(score,2)})")
    else:
        print(f"MCQs Rejected ❌ ({score})")
        exit()

    # ---------------------------------------------------
    # STEP 7: Adaptive Difficulty Quiz
    # ---------------------------------------------------

    if isinstance(mcqs, str):
        mcqs = [mcqs]

    for q in mcqs:
        print("\nQuestion:", q)

        user_answer = input("Enter your answer (A/B/C/D): ")

        # TODO: Replace with real answer extraction logic
        correct_answer = "A"

        if user_answer.upper() == correct_answer:
            print("Correct ✅")
            engine.update_score(True)
        else:
            print("Wrong ❌")
            engine.update_score(False)

        print("Current Accuracy:", round(engine.get_accuracy(), 2))
        print("Next Difficulty:", engine.get_next_difficulty())