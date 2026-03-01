class DifficultyEngine:
    def __init__(self):
        self.score = 0
        self.total = 0

    def update_score(self, correct):
        self.total += 1
        if correct:
            self.score += 1

    def get_accuracy(self):
        if self.total == 0:
            return 0
        return self.score / self.total

    def get_next_difficulty(self):
        accuracy = self.get_accuracy()

        if accuracy < 0.4:
            return "Easy"
        elif accuracy < 0.7:
            return "Medium"
        else:
            return "Hard"