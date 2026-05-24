import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useRegister, useListClasses } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Ism familiyangizni kiriting"),
    phone_number: z
      .string()
      .min(9, "Telefon raqamini kiriting")
      .regex(/^\+?[0-9\s\-()]+$/, "Noto'g'ri format"),
    class_name: z.string().min(1, "Sinfni tanlang"),
    login: z
      .string()
      .min(4, "Login kamida 4 ta belgi bo'lishi kerak")
      .regex(/^[a-zA-Z0-9_]+$/, "Faqat lotin harflar, raqamlar va _"),
    password: z.string().min(6, "Parol kamida 6 ta belgi bo'lishi kerak"),
    confirm_password: z.string().min(1, "Parolni tasdiqlang"),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Parollar mos kelmaydi",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  const registerMutation = useRegister();
  const { data: classes, isLoading: classesLoading } = useListClasses({
    query: { queryKey: ["classes", "list"] },
  });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      phone_number: "",
      class_name: "",
      login: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    const { confirm_password: _, ...payload } = data;
    registerMutation.mutate(
      { data: payload },
      {
        onSuccess: (result) => {
          authLogin(result);
          toast({
            title: "Muvaffaqiyatli ro'yxatdan o'tdingiz!",
            description: `Xush kelibsiz, ${result.full_name}`,
          });
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik";
          toast({
            variant: "destructive",
            title: "Xatolik",
            description: msg.includes("login")
              ? "Bu login band. Boshqa login tanlang."
              : msg,
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-secondary/30">
      {/* Chap panel — forma */}
      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <img
              src="/logo.png"
              alt="Talim Platform"
              className="h-20 w-auto object-contain"
            />
          </div>

          <h2 className="text-2xl font-semibold text-foreground text-center">
            Ro'yxatdan o'tish
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            O'quvchi sifatida akkaunt yarating
          </p>

          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ism Familiya</FormLabel>
                      <FormControl>
                        <Input placeholder="Ali Valiyev" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon raqam</FormLabel>
                      <FormControl>
                        <Input placeholder="+998 90 123 45 67" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sinf — faqat admin yaratgan sinflar */}
                <FormField
                  control={form.control}
                  name="class_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sinf</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={classesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                classesLoading
                                  ? "Sinflar yuklanmoqda..."
                                  : classes && classes.length === 0
                                    ? "Hozircha sinflar yo'q"
                                    : "Sinfni tanlang"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes?.map((cls) => (
                            <SelectItem key={cls.id} value={cls.name}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ali_valiyev"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parol</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parolni tasdiqlash</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={registerMutation.isPending || classesLoading}
                >
                  {registerMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Ro'yxatdan o'tish
                </Button>
              </form>
            </Form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Akkauntingiz bormi?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Tizimga kirish
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* O'ng panel */}
      <div className="hidden lg:flex relative w-0 flex-1 bg-primary flex-col items-center justify-center p-12">
        <img
          src="/logo.png"
          alt="Talim Platform"
          className="w-72 h-auto object-contain mb-8 drop-shadow-2xl"
        />
        <div className="text-primary-foreground text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4">Toshloq tumani 3-maktab</h1>
          <p className="text-lg opacity-80">
            Yagona ta'lim boshqaruvi platformasi. O'quvchilar, o'qituvchilar
            va dars jarayonlarini samarali nazorat qiling.
          </p>
        </div>
      </div>
    </div>
  );
}
