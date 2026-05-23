import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useCreateStudent } from "@workspace/api-client-react";
import { ChevronLeft, Loader2 } from "lucide-react";

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
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function NewStudent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
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
        onSuccess: () => {
          toast({
            title: "Muvaffaqiyatli",
            description: "Yangi o'quvchi qo'shildi",
          });
          setLocation("/students");
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
