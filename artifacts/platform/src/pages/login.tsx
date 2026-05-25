import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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

const loginSchema = z.object({
  login: z.string().min(1, "Loginni kiriting"),
  password: z.string().min(1, "Parolni kiriting"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();
  const [botLoginLoading, setBotLoginLoading] = useState(false);

  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  // Telegram bot magic token orqali avtomatik kirish
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;

    setBotLoginLoading(true);
    fetch(`/api/auth/bot-login?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.token) {
          authLogin(data);
          setLocation("/dashboard");
        } else {
          toast({
            variant: "destructive",
            title: "Havola yaroqsiz",
            description: "Telegram havolasi muddati o'tgan. Iltimos qayta urinib ko'ring.",
          });
          setBotLoginLoading(false);
        }
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Xatolik",
          description: "Serverga ulanishda xatolik yuz berdi.",
        });
        setBotLoginLoading(false);
      });
  }, []);

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (result) => {
          authLogin(result);
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Xatolik",
            description: "Login yoki parol noto'g'ri",
          });
        },
      }
    );
  };

  if (botLoginLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 gap-4">
        <img src="/logo.png" alt="Talim Platform" className="h-20 w-auto object-contain" />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Telegram orqali kirilmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-secondary/30">
      {/* Chap panel — kirish formasi */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="Talim Platform"
              className="h-24 w-auto object-contain"
            />
          </div>

          <h2 className="text-2xl font-semibold text-foreground text-center">
            Tizimga kirish
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            O'z login va parolingiz bilan kiring
          </p>
          <p className="mt-2 text-sm font-medium text-primary text-center">
            Farg'ona viloyati Toshloq tumani 3-maktab
          </p>

          <div className="mt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="login123"
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
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Kirish
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Akkauntingiz yo'qmi?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Ro'yxatdan o'tish
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* O'ng panel — logo va tavsif */}
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
