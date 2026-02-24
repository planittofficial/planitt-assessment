import Answer from "../models/Answer";
import Attempt from "../models/Attempt";
import Question from "../models/Question";

export async function autoGradeMCQs(attemptId: string) {
  const answers = await Answer.find({
    attempt_id: attemptId,
    is_graded: false,
  }).populate({
    path: "question_id",
    match: { question_type: "mcq" },
    select: "correct_answer marks",
  });

  let total = 0;

  for (const answer of answers) {
    if (!answer.question_id) continue;

    const question = answer.question_id as any;
    const isCorrect = answer.answer_text === question.correct_answer;
    const marksObtained = isCorrect ? Number(question.marks) : 0;

    total += marksObtained;

    await Answer.findByIdAndUpdate(answer._id, {
      marks_obtained: marksObtained,
      is_graded: true,
    });
  }

  return total;
}

export async function calculateFinalScore(attemptId: string) {
  const answers = await Answer.find({ attempt_id: attemptId });
  const score = answers.reduce((sum, a) => sum + (a.marks_obtained || 0), 0);

  await Attempt.findByIdAndUpdate(attemptId, {
    final_score: score,
  });

  return score;
}
