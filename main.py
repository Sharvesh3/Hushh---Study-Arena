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

    # Initialize modules
    extractor = DocumentExtractor()
    cleaner = TextCleaner()

    file_path = "data/sample_notes.pdf"

    if not os.path.exists(file_path):
        print("File not found.")
    else:
        # Step 1: Extract
        raw_text = extractor.extract(file_path)
        print("\n✔ Extraction Completed")

        # Step 2: Clean + Segment
        sentences = cleaner.process(raw_text)
        print("✔ Cleaning Completed")

        print("\nTotal Clean Sentences:", len(sentences))
        print("\nFirst 5 Sentences:\n")

        for i, sentence in enumerate(sentences[:5], 1):
            print(f"{i}. {sentence}\n")



chunker = SemanticChunker(similarity_threshold=0.65)

chunks = chunker.create_chunks(sentences)

print("✔ Semantic Chunking Completed")
print("Total Chunks Created:", len(chunks))
print("\nFirst 3 Chunks:\n")

for i, chunk in enumerate(chunks[:3], 1):
    print(f"Chunk {i}:\n{chunk}\n")

# Step 4: Build Vector DB
vectordb = VectorDatabase()
vectordb.build_index(chunks)

print("✔ FAISS Index Built")

# Test retrieval
sample_query = "Explain supervised learning"

retrieved_chunks = vectordb.retrieve(sample_query, top_k=3)

print("\nQuery:", sample_query)
print("\nTop Retrieved Chunks:\n")

for i, chunk in enumerate(retrieved_chunks, 1):
    print(f"Result {i}:\n{chunk}\n")

# Step 5: Knowledge Graph
graph_builder = KnowledgeGraphBuilder()
graph = graph_builder.build_graph(chunks)

print("✔ Knowledge Graph Built")
print("Total Nodes:", graph.number_of_nodes())
print("Total Edges:", graph.number_of_edges())

print("\nSample Nodes:")
for node in list(graph.nodes())[:5]:
    print(node)

# Step 6: Centrality Scoring
centrality_engine = ConceptCentrality(graph, chunks)
concept_scores = centrality_engine.compute_scores()

print("\n✔ Concept Centrality Computed")

print("\nTop 10 Important Concepts:\n")
for i, (concept, score) in enumerate(list(concept_scores.items())[:10], 1):
    print(f"{i}. {concept} → {round(score, 4)}")

# Step 7: RAG Question Generation

generator = RAGQuestionGenerator()

# Example query
query = "Explain supervised learning"

# Retrieve relevant chunks
retrieved_chunks = vectordb.retrieve(query, top_k=3)

# Combine into context
context_text = " ".join(retrieved_chunks)

print("\n✔ Retrieved Context for Generation")

mcqs = generator.generate(context_text)

print("\nGenerated MCQs:\n")
print(mcqs)

# Step 8: Hallucination Guard

guard = HallucinationGuard(threshold=0.60)

is_valid, score = guard.verify(mcqs, context_text)

print("\n✔ Hallucination Check Completed")


if isinstance(score, float):
    if is_valid:
        print(f"MCQs Accepted ✅ (Grounding Score: {round(score,2)})")
    else:
        print(f"MCQs Rejected ❌ (Grounding Score: {round(score,2)})")
else:
    print(f"MCQs Rejected ❌ ({score})")

engine = DifficultyEngine()

for q in mcqs:
    level = classifier.classify(q)

    print(f"\nQuestion: {q}")
    print(f"Bloom Level: {level}")

    user_answer = input("Enter your answer (A/B/C/D): ")

    # For now simulate correct answer as "A"
    correct_answer = "A"

    if user_answer.upper() == correct_answer:
        print("Correct ✅")
        engine.update_score(True)
    else:
        print("Wrong ❌")
        engine.update_score(False)

    print("Current Accuracy:", round(engine.get_accuracy(),2))
    print("Next Difficulty:", engine.get_next_difficulty())