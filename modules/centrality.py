import networkx as nx
from collections import Counter


class ConceptCentrality:
    """
    Computes importance score for each concept using:
    - PageRank
    - Degree centrality
    - Frequency weighting
    """

    def __init__(self, graph, chunks):
        self.graph = graph
        self.chunks = chunks

    # ---------------------------------------------------
    # Compute frequency of concepts in chunks
    # ---------------------------------------------------
    def compute_frequency(self):
        freq_counter = Counter()

        for chunk in self.chunks:
            for node in self.graph.nodes():
                if node.lower() in chunk.lower():
                    freq_counter[node] += 1

        return freq_counter

    # ---------------------------------------------------
    # Compute combined centrality score
    # ---------------------------------------------------
    def compute_scores(self):
        pagerank_scores = nx.pagerank(self.graph)
        degree_scores = nx.degree_centrality(self.graph)
        frequency_scores = self.compute_frequency()

        combined_scores = {}

        for node in self.graph.nodes():

            pr = pagerank_scores.get(node, 0)
            deg = degree_scores.get(node, 0)
            freq = frequency_scores.get(node, 0)

            # Weighted combination (tunable)
            combined = (0.5 * pr) + (0.3 * deg) + (0.2 * freq)

            combined_scores[node] = combined

        # Sort by importance
        ranked = dict(
            sorted(combined_scores.items(),
                   key=lambda item: item[1],
                   reverse=True)
        )

        return ranked