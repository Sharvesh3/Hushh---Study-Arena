import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer


class VectorDatabase:
    """
    Handles:
    - Embedding chunk storage
    - FAISS index building
    - Top-k semantic retrieval
    - Saving & Loading index
    """

    def __init__(self, model_name="all-mpnet-base-v2"):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.chunk_store = []

    # ---------------------------------------------------
    # Build FAISS index
    # ---------------------------------------------------
    def build_index(self, chunks):
        self.chunk_store = chunks
        embeddings = self.model.encode(chunks, convert_to_numpy=True)
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings.astype("float32"))

    # ---------------------------------------------------
    # Retrieve
    # ---------------------------------------------------
    def retrieve(self, query, top_k=3):
        if self.index is None:
            raise ValueError("Index not built yet.")

        query_embedding = self.model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(
            query_embedding.astype("float32"), top_k
        )

        return [self.chunk_store[idx] for idx in indices[0]]

    # ---------------------------------------------------
    # Save index + chunks
    # ---------------------------------------------------
    def save(self, index_path="vector.index", chunk_path="chunks.pkl"):
        if self.index is None:
            raise ValueError("No index to save.")

        # Save FAISS index
        faiss.write_index(self.index, index_path)

        # Save chunk store
        with open(chunk_path, "wb") as f:
            pickle.dump(self.chunk_store, f)

        print("Vector database saved successfully.")

    # ---------------------------------------------------
    # Load index + chunks
    # ---------------------------------------------------
    def load(self, index_path="vector.index", chunk_path="chunks.pkl"):
        self.index = faiss.read_index(index_path)

        with open(chunk_path, "rb") as f:
            self.chunk_store = pickle.load(f)

        print("Vector database loaded successfully.")