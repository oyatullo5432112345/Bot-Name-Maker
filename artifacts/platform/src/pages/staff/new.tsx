import { useState } from "react";
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
import { ChevronLeft, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const COMMON_SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Fizika", "Kimyo", "Biologiya", "Geografiya", "Tarix",
  "Informatika", "Chizmachilik", "Jismoniy tarbiya", "Musiqa",
  "Texnologiya", "Astronomiya", "Mehnat", "Tarbiya soati",
];

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
const managerRoles = [StaffInputRole.director, StaffInputRole.zam_direktor, StaffInputRole.zavuch];

export default function NewStaff() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [canTeach, setCanTeach] = useState(false);

  const createMutation = useCreateStaff();

  const { data: classes } = useListClasses({
    query: { queryKey: getListClassesQueryKey() }
  });

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { full_name: "", class_id: null },
  });

  const roleValue = form.watch("role");
  const showClassField = rolesWithClass.includes(roleValue as typeof rolesWithClass[number]);
  const isTeacherRole = roleValue === StaffInputRole.teacher || roleValue === StaffInputRole.sinf_rahbari;
  const isManagerRole = managerRoles.includes(roleValue as typeof managerRoles[number]);
  const showSubjects = isTeacherRole || (isManagerRole && canTeach);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const onSubmit = (data: StaffFormValues) => {
    const payload = {
      ...data,
      class_id: showClassField ? (data.class_id || null) : null,
      can_teach: isTeacherRole ? true : (isManagerRole ? canTeach : false),
      subjects: showSubjects ? selectedSubjects : [],
    };

    createMutation.mutate(
      { data: payload as Parameters<typeof createMutation.mutate>[0]["data"] },
      {
        onSuccess: (result: unknown) => {
          const newId = (result as { id?: string }).id;
          if ((isTeacherRole || (isManagerRole && canTeach)) && newId) {
            toast({
              title: roleValue === StaffInputRole.sinf_rahbari ? "Sinf rahbari qo'shildi" : "Xodim qo'shildi",
              description: "Endi fanlarni biriktiring",
            });
            setLocation(`/staff/${newId}/subjects`);
          } else {
            toast({
              title: "Muvaffaqiyatli",
              description: "Yangi xodim qo'shildi",
            });
            setLocation("/staff");
          }
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
                      setSelectedSubjects([]);
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
                        <SelectItem value={StaffInputRole.teacher}>Fan o'qituvchisi</SelectItem>
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
                          : "Sinf rahbari bo'ladigan sinf (ixtiyoriy)"}
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

            {isManagerRole && (
              <div className="flex items-center gap-3 rounded-md border p-3 bg-amber-50 border-amber-200">
                <input
                  type="checkbox"
                  id="can_teach_chk"
                  checked={canTeach}
                  onChange={(e) => {
                    setCanTeach(e.target.checked);
                    if (!e.target.checked) setSelectedSubjects([]);
                  }}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="can_teach_chk" className="text-sm text-amber-800 cursor-pointer">
                  Bu rahbar dars ham o'tadi — fanlarni belgilash imkoniyatini yoqish
                </label>
              </div>
            )}

            {showSubjects && (
              <div className="space-y-3">
                <div>
                  <FormLabel>
                    {isManagerRole ? "O'qitiladigan fanlar (rahbar)" : roleValue === StaffInputRole.sinf_rahbari
                      ? "O'qitiladigan fanlar (sinf rahbari)"
                      : "O'qitiladigan fanlar (ixtiyoriy, keyinroq ham belgilash mumkin)"}
                  </FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Qo'shgandan so'ng har bir fanga sinflar biriktirasiz
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SUBJECTS.map(subject => {
                    const selected = selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-secondary border-border text-foreground"
                        }`}
                      >
                        {selected && <span className="mr-1">✓</span>}
                        {subject}
                      </button>
                    );
                  })}
                </div>
                {selectedSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedSubjects.map(s => (
                      <Badge key={s} variant="secondary" className="gap-1">
                        {s}
                        <button onClick={() => toggleSubject(s)} type="button">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-muted-foreground">
                  💡 Qo'shilgandan so'ng avtomatik ravishda <strong>fanlarni biriktirish sahifasiga</strong> o'tasiz.
                </div>
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isTeacherRole ? "Qo'shish va fanlarni biriktirish →" : "Saqlash"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
