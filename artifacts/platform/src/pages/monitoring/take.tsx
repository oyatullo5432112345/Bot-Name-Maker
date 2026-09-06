import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const MonitoringTakePage = ({ API_BASE, authHeaders }: any) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { data: test, isLoading, error } = useQuery({
    queryKey: ["monitoring-test-take", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/monitoring/tests/${id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        throw new Error("Test ma'lumotlarini yuklab bo'lmadi");
      }
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-6 text-center">Test yuklanmoqda...</div>;
  if (error || !test) return <div className="p-6 text-center text-red-500">Test topilmadi yoki savollar mavjud emas!</div>;

  const questions = test.questions || [];

  if (questions.length === 0) {
    return <div className="p-6 text-center font-medium">Ushbu testda hali savollar yo'q.</div>;
  }

  const handleSelectAnswer = (qIndex: number, letter: string) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: letter }));
  };

  const handleSubmitTest = async () => {
    try {
      const res = await fetch(`${API_BASE}/monitoring/tests/${id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) throw new Error("Javoblarni yuborishda xatolik");

      toast.success("Test yakunlandi!");
      navigate("/monitoring");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <p className="text-sm text-muted-foreground">Jami savollar: {questions.length} ta</p>
        </CardHeader>
      </Card>

      {questions.map((q: any, idx: number) => (
        <Card key={idx} className="p-4 space-y-3">
          <h3 className="font-semibold text-base">
            {idx + 1}. {q.questionText}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {q.options?.map((opt: string, optIdx: number) => {
              const letter = String.fromCharCode(65 + optIdx);
              const isSelected = answers[idx] === letter;
              return (
                <Button
                  key={optIdx}
                  variant={isSelected ? "default" : "outline"}
                  className="justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleSelectAnswer(idx, letter)}
                >
                  <span className="font-bold mr-2">{letter})</span> {opt}
                </Button>
              );
            })}
          </div>
        </Card>
      ))}

      <Button onClick={handleSubmitTest} className="w-full size-lg">
        Testni yakunlash
      </Button>
    </div>
  );
};
