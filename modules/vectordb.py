import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


class VectorDatabase:
    """
    Handles:
    - Embedding chunk storage
    - FAISS index building
    - Top-k semantic retrieval
    """

    def __init__(self, model_name="all-mpnet-base-v2"):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.chunk_store = []

    # ---------------------------------------------------
    # Build FAISS index
    # ---------------------------------------------------
    def build_index(self, chunks):
        """
        Converts chunks to embeddings and stores in FAISS index.
        """
        self.chunk_store = chunks

        embeddings = self.model.encode(chunks, convert_to_numpy=True)

        dimension = embeddings.shape[1]

        # L2 distance index
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings.astype("float32"))

    # ---------------------------------------------------
    # Retrieve top-k similar chunks
    # ---------------------------------------------------
    def retrieve(self, query, top_k=3):
        """
        Returns top-k most relevant chunks for a query.
        """
        if self.index is None:
            raise ValueError("Index not built yet.")

        query_embedding = self.model.encode([query], convert_to_numpy=True)

        distances, indices = self.index.search(
            query_embedding.astype("float32"), top_k
        )

        results = []
        for idx in indices[0]:
            results.append(self.chunk_store[idx])

        return results