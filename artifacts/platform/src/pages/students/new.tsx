import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { ChevronLeft, Loader2, CheckCircle2, Copy, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const studentSchema = z.object({
  full_name: z.string().min(2, "F.I.O ni kiriting"),
  phone_number: z.string().min(5, "Telefon raqamni kiriting"),
  class_name: z.string().min(1, "Sinf nomini kiriting"),
  birthday: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface CreatedInfo { full_name: string; login: string; login_id: string; password: string }

export default function NewStudent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<CreatedInfo | null>(null);

  const createMutation = useCreateStudent();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: "",
      phone_number: "+998",
      class_name: "",
    },
  });

  const onSubmit = (data: StudentFormValues) => {
    createMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          // Server yangi o'quvchining login / Kirish ID / parolini bir marta qaytaradi
          const r = res as unknown as { login?: string; login_id?: string; password?: string };
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey({}) });
          setCreated({
            full_name: data.full_name,
            login: r.login ?? "—",
            login_id: r.login_id ?? "—",
            password: r.password ?? "—",
          });
          form.reset({ full_name: "", phone_number: "+998", class_name: "" });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Xatolik",
            description: "O'quvchini qo'shishda xatolik yuz berdi",
          });
        },
      }
    );
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: "Nusxalandi", description: label }),
      () => toast({ variant: "destructive", title: "Nusxalab bo'lmadi" }),
    );
  };

  // Muvaffaqiyatli qo'shilgach — login/ID/parolni ko'rsatamiz (admin o'quvchiga beradi)
  if (created) {
    const rows: { label: string; value: string }[] = [
      { label: "Kirish ID", value: created.login_id },
      { label: "Login", value: created.login },
      { label: "Parol", value: created.password },
    ];
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="rounded-2xl border bg-card p-6 text-center space-y-4 pop-in">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "#22c55e22" }}>
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{created.full_name} qo'shildi</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Quyidagi ma'lumotlarni o'quvchiga bering — keyin ko'rinmaydi.</p>
          </div>
          <div className="space-y-2 text-left">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{r.label}</p>
                  <p className="font-mono font-bold truncate">{r.value}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copy(r.value, r.label)} title="Nusxalash">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setCreated(null)}>
              <Plus className="w-4 h-4 mr-1.5" /> Yana qo'shish
            </Button>
            <Button className="flex-1" onClick={() => setLocation("/students")}>
              Ro'yxatga qaytish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/students")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yangi o'quvchi qo'shish</h1>
          <p className="text-muted-foreground mt-1">Tizimga yangi o'quvchi ma'lumotlarini kiritish</p>
        </div>
      </div>

      <div className="border rounded-md bg-card p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>F.I.O</FormLabel>
                  <FormControl>
                    <Input placeholder="Palonchiyev Pistonchi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon raqami</FormLabel>
                    <FormControl>
                      <Input placeholder="+998901234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sinf nomi</FormLabel>
                    <FormControl>
                      <Input placeholder="10-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tug'ilgan sana (ixtiyoriy)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation("/students")}
                disabled={createMutation.isPending}
              >
                Bekor qilish
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Saqlash
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
