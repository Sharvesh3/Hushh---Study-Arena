import networkx as nx
import numpy as np
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


class KnowledgeGraphBuilder:
    """
    Constructs a semantic knowledge graph from document chunks.
    """

    def __init__(self, embedding_model="all-mpnet-base-v2"):
        self.graph = nx.Graph()
        self.kw_model = KeyBERT(model=embedding_model)
        self.embedder = SentenceTransformer(embedding_model)

    # ---------------------------------------------------
    # Extract keywords from chunks
    # ---------------------------------------------------
    def extract_keywords(self, chunks, top_n=5):
        """
        Extracts top keywords per chunk.
        """
        all_keywords = set()

        for chunk in chunks:
            keywords = self.kw_model.extract_keywords(
                chunk,
                keyphrase_ngram_range=(1, 2),
                stop_words="english",
                top_n=top_n
            )

            for word, score in keywords:
                all_keywords.add(word)

        return list(all_keywords)

    # ---------------------------------------------------
    # Build graph nodes and edges
    # ---------------------------------------------------
    def build_graph(self, chunks, similarity_threshold=0.6):
        """
        Creates graph based on semantic similarity between keywords.
        """

        keywords = self.extract_keywords(chunks)

        # Add nodes
        for word in keywords:
            self.graph.add_node(word)

        # Generate embeddings for keywords
        embeddings = self.embedder.encode(keywords, convert_to_numpy=True)

        # Add edges based on cosine similarity
        for i in range(len(keywords)):
            for j in range(i + 1, len(keywords)):

                sim = cosine_similarity(
                    [embeddings[i]],
                    [embeddings[j]]
                )[0][0]

                if sim >= similarity_threshold:
                    self.graph.add_edge(
                        keywords[i],
                        keywords[j],
                        weight=float(sim)
                    )

        return self.graph