import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


class SemanticChunker:
    """
    Groups semantically similar sentences into coherent chunks.
    Uses embedding similarity instead of fixed-size splitting.
    """

    def __init__(self, model_name="all-mpnet-base-v2", similarity_threshold=0.65):
        self.model = SentenceTransformer(model_name)
        self.similarity_threshold = similarity_threshold

    # ---------------------------------------------------
    # Generate sentence embeddings
    # ---------------------------------------------------
    def embed_sentences(self, sentences):
        return self.model.encode(sentences, convert_to_numpy=True)

    # ---------------------------------------------------
    # Semantic grouping logic
    # ---------------------------------------------------
    def create_chunks(self, sentences):
        if not sentences:
            return []

        embeddings = self.embed_sentences(sentences)

        chunks = []
        current_chunk = [sentences[0]]

        for i in range(1, len(sentences)):

            similarity = cosine_similarity(
                [embeddings[i - 1]],
                [embeddings[i]]
            )[0][0]

            # If semantically similar → same chunk
            if similarity >= self.similarity_threshold:
                current_chunk.append(sentences[i])
            else:
                # Save current chunk
                chunks.append(" ".join(current_chunk))
                current_chunk = [sentences[i]]

        # Append final chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks