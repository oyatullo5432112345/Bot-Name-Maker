import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { 
  useCreateStaff, 
  useListClasses, 
  getListClassesQueryKey,
  StaffInputRole 
} from "@workspace/api-client-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const staffSchema = z.object({
  full_name: z.string().min(2, "F.I.O ni kiriting"),
  role: z.enum([
    StaffInputRole.director,
    StaffInputRole.zam_direktor,
    StaffInputRole.zavuch,
    StaffInputRole.sinf_rahbari,
    StaffInputRole.teacher,
    StaffInputRole.kutubxonachi,
  ], { required_error: "Lavozimni tanlang" }),
  class_id: z.string().nullable().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

const rolesWithClass = [StaffInputRole.sinf_rahbari, StaffInputRole.teacher];

export default function NewStaff() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const createMutation = useCreateStaff();

  const { data: classes } = useListClasses({
    query: {
      queryKey: getListClassesQueryKey()
    }
  });

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      full_name: "",
      class_id: null,
    },
  });

  const roleValue = form.watch("role");
  const showClassField = rolesWithClass.includes(roleValue as typeof rolesWithClass[number]);

  const onSubmit = (data: StaffFormValues) => {
    const payload = {
      ...data,
      class_id: showClassField ? (data.class_id || null) : null
    };

    createMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({
            title: "Muvaffaqiyatli",
            description: "Yangi xodim qo'shildi",
          });
          setLocation("/staff");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Xatolik",
            description: "Xodimni qo'shishda xatolik yuz berdi",
          });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/staff")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yangi xodim qo'shish</h1>
          <p className="text-muted-foreground mt-1">Tizimga yangi xodim ma'lumotlarini kiritish</p>
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
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lavozimi</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue("class_id", null);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={StaffInputRole.director}>Direktor</SelectItem>
                        <SelectItem value={StaffInputRole.zam_direktor}>Direktor o'rinbosari</SelectItem>
                        <SelectItem value={StaffInputRole.zavuch}>Zavuch</SelectItem>
                        <SelectItem value={StaffInputRole.sinf_rahbari}>Sinf rahbari</SelectItem>
                        <SelectItem value={StaffInputRole.teacher}>O'qituvchi</SelectItem>
                        <SelectItem value={StaffInputRole.kutubxonachi}>Kutubxonachi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showClassField && (
                <FormField
                  control={form.control}
                  name="class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {roleValue === StaffInputRole.sinf_rahbari 
                          ? "Rahbarlik sinfi" 
                          : "Asosiy sinf (ixtiyoriy)"}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sinfni tanlang..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {roleValue === StaffInputRole.sinf_rahbari && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm text-muted-foreground">
                💡 Sinf rahbari bitta sinfga mas'ul bo'ladi. U ham o'qituvchi sifatida fanlarga biriktirilishi mumkin.
              </div>
            )}

            {roleValue === StaffInputRole.teacher && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-muted-foreground">
                💡 O'qituvchi turli sinflarga turli fanlardan dars beradi. Fanlarni "Sinflar" bo'limida biriktirish mumkin.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation("/staff")}
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
