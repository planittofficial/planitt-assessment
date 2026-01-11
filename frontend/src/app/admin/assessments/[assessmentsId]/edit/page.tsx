"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAssessmentQuestions, addQuestion, bulkAddQuestions, deleteQuestion, getAssessmentById, updateAssessment } from "@/services/admin.service";
import Link from "next/link";

export default function EditAssessmentPage() {
  const params = useParams();
  const assessmentId = params.assessmentsId as string;
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingCriteria, setUpdatingCriteria] = useState(false);
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);

  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    question_type: "MCQ" as "MCQ" | "DESCRIPTIVE",
    marks: 1,
    correct_answer: "",
    options: ["", "", "", ""],
  });

  useEffect(() => {
    loadData();
  }, [assessmentId]);

  async function loadData() {
    try {
      const [qData, aData] = await Promise.all([
        getAssessmentQuestions(assessmentId),
        getAssessmentById(assessmentId)
      ]);
      setQuestions(qData);
      setAssessment(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCriteria() {
    setUpdatingCriteria(true);
    try {
      await updateAssessment(assessmentId, {
        pass_percentage: assessment.pass_percentage
      });
      alert("Criteria updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to update criteria");
    } finally {
      setUpdatingCriteria(false);
    }
  }

  async function loadQuestions() {
    try {
      const data = await getAssessmentQuestions(assessmentId);
      setQuestions(data);
      // Also refresh assessment to get updated total_marks
      const aData = await getAssessmentById(assessmentId);
      setAssessment(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSmartPasteParse() {
    const lines = smartPasteText.split("\n").map(l => l.trim()).filter(l => l !== "");
    const result: any[] = [];
    let currentQ: any = null;

    lines.forEach(line => {
      if (/^\d+[\.\)]/.test(line) || line.startsWith("Q:")) {
        if (currentQ) result.push(currentQ);
        currentQ = {
          question_text: line.replace(/^\d+[\.\)]\s*/, "").replace(/^Q:\s*/, ""),
          question_type: "MCQ",
          marks: 1,
          options: [],
          correct_answer: ""
        };
      } else if (currentQ) {
        if (/^[a-dA-D][\.\)]/.test(line)) {
          currentQ.options.push(line.replace(/^[a-dA-D][\.\)]\s*/, ""));
        } else if (line.toLowerCase().startsWith("correct:")) {
          const ansKey = line.split(":")[1].trim().toUpperCase();
          const index = ansKey.charCodeAt(0) - 65;
          if (index >= 0 && index < currentQ.options.length) {
            currentQ.correct_answer = currentQ.options[index];
          } else {
            currentQ.correct_answer = ansKey;
          }
        } else if (line.toLowerCase().startsWith("marks:")) {
          currentQ.marks = Number(line.split(":")[1].trim()) || 1;
        } else if (line.toLowerCase().includes("descriptive")) {
          currentQ.question_type = "DESCRIPTIVE";
        }
      }
    });

    if (currentQ) result.push(currentQ);
    setParsedQuestions(result);
  }

  async function handleJsonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setParsedQuestions(json);
          setShowSmartPaste(true);
        } else {
          alert("Invalid JSON format. Expected an array of questions.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  }

  async function handleBulkSubmit() {
    setSubmitting(true);
    try {
      await bulkAddQuestions(assessmentId, parsedQuestions);
      setParsedQuestions([]);
      setSmartPasteText("");
      setShowSmartPaste(false);
      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Bulk upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...newQuestion,
        options: newQuestion.question_type === "MCQ" ? newQuestion.options.filter(o => o.trim() !== "") : [],
      };
      await addQuestion(assessmentId, payload);
      setNewQuestion({
        question_text: "",
        question_type: "MCQ",
        marks: 1,
        correct_answer: "",
        options: ["", "", "", ""],
      });
      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Failed to add question");
    } finally {
      setSubmitting(false);
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteQuestion(assessmentId, questionId);
      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Failed to delete question");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <div className="mb-6">
          <Link href="/admin/assessments" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Back to Assessments
          </Link>
        </div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Questions</h1>
          <div className="flex gap-3">
            <label className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg border border-neutral-700 transition-colors flex items-center gap-2 cursor-pointer text-sm">
              <span>📁 Upload JSON</span>
              <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
            </label>
            <button
              onClick={() => setShowSmartPaste(!showSmartPaste)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg border border-neutral-700 transition-colors flex items-center gap-2 text-sm"
            >
              {showSmartPaste ? "← Manual Mode" : "✨ Smart Paste"}
            </button>
          </div>
        </div>
        
        {assessment && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-yellow-500 flex items-center gap-2">
              🏆 Pass/Fail Criteria
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Pass Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={assessment.pass_percentage}
                  onChange={(e) => setAssessment({ ...assessment, pass_percentage: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase font-bold tracking-widest">Calculated Passing Marks</p>
                <p className="text-xl font-bold text-white">
                  {((assessment.total_marks * assessment.pass_percentage) / 100).toFixed(2)} 
                  <span className="text-sm font-normal text-gray-500 ml-2">/ {assessment.total_marks}</span>
                </p>
              </div>
              <button
                onClick={handleUpdateCriteria}
                disabled={updatingCriteria}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                {updatingCriteria ? "Saving..." : "Update Criteria"}
              </button>
            </div>
          </div>
        )}

        {showSmartPaste ? (
          <div className="space-y-8">
            <div className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-yellow-500">Smart Paste</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Paste your questions below or upload a JSON file. Format: <br/>
                1. Question? <br/>
                A) Option, Correct: A, Marks: 2
              </p>
              <textarea
                value={smartPasteText}
                onChange={(e) => setSmartPasteText(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-4 focus:outline-none focus:border-yellow-500 transition-colors h-64 font-mono text-sm mb-4"
                placeholder="1. What is React?&#10;A) Library&#10;B) Framework&#10;Correct: A&#10;Marks: 1"
              />
              <button
                onClick={handleSmartPasteParse}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded-lg font-bold transition-all border border-neutral-700 w-full"
              >
                Parse Questions
              </button>
            </div>

            {parsedQuestions.length > 0 && (
              <div className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 shadow-xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  Parsed Preview
                  <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full">{parsedQuestions.length}</span>
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {parsedQuestions.map((q, i) => (
                    <div key={i} className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                      <p className="font-medium text-sm mb-2">{i+1}. {q.question_text}</p>
                      <div className="flex gap-4 text-[10px] text-gray-500 uppercase font-bold">
                        <span>{q.question_type}</span>
                        <span>{q.marks} Marks</span>
                        <span className="text-green-500">Ans: {q.correct_answer}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-8">
                   <button
                    onClick={() => setParsedQuestions([])}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-lg transition-all border border-neutral-700"
                  >
                    Clear
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleBulkSubmit}
                    className="flex-[2] bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-all shadow-lg shadow-yellow-500/10"
                  >
                    {submitting ? "Uploading..." : `Upload ${parsedQuestions.length} Questions`}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 mb-12 shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-yellow-500">Add New Question</h2>
            <form onSubmit={handleAddQuestion} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Question Text</label>
                <textarea
                  required
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors h-24"
                  placeholder="Enter the question..."
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
                  <select
                    value={newQuestion.question_type}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value as "MCQ" | "DESCRIPTIVE" })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="DESCRIPTIVE">Descriptive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Marks</label>
                  <input
                    type="number"
                    required
                    value={newQuestion.marks}
                    onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                </div>
              </div>
              {newQuestion.question_type === "MCQ" && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-400">Options & Correct Answer</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {newQuestion.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={newQuestion.correct_answer === opt && opt !== ""}
                          onChange={() => setNewQuestion({ ...newQuestion, correct_answer: opt })}
                          className="w-4 h-4 accent-yellow-500"
                          disabled={opt === ""}
                        />
                        <input
                          required={idx < 2}
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
                          placeholder={`Option ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                disabled={submitting}
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/10"
              >
                {submitting ? "Adding..." : "+ Add Question"}
              </button>
            </form>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            Questions 
            <span className="text-sm bg-neutral-800 text-gray-400 px-3 py-1 rounded-full">{questions.length}</span>
          </h2>
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-500 animate-pulse">Loading questions...</p>
            ) : questions.length === 0 ? (
              <p className="text-gray-500 italic">No questions added yet.</p>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 transition-all hover:border-neutral-700">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <span className="text-xs font-mono text-gray-500 block mb-1">Question {idx + 1} • {q.question_type}</span>
                      <p className="text-lg font-medium">{q.question_text}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="bg-neutral-800 px-3 py-1 rounded text-sm font-bold text-yellow-500">
                        {q.marks} Marks
                      </span>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-xs text-red-500 hover:text-red-400 font-bold transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  {q.question_type === "MCQ" && q.options && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {q.options.filter((o: any) => o.text).map((o: any) => (
                        <div 
                          key={o.id} 
                          className={`px-4 py-2 rounded-lg text-sm border ${
                            o.text === q.correct_answer 
                              ? "bg-green-500/10 border-green-500/50 text-green-400" 
                              : "bg-neutral-950 border-neutral-800 text-gray-400"
                          }`}
                        >
                          {o.text}
                          {o.text === q.correct_answer && <span className="ml-2 text-[10px] font-bold">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
