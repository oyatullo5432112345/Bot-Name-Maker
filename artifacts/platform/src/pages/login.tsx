import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { ShieldAlert, Loader2 } from "lucide-react";

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
  
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  });

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

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <ShieldAlert className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              TALIM PLATFORM
            </h2>
          </div>
          
          <h2 className="mt-8 text-2xl font-semibold text-foreground">
            Tizimga kirish
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O'z login va parolingiz bilan tizimga kiring
          </p>

          <div className="mt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="admin123" 
                          autoComplete="username"
                          autoCapitalize="username"
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
                  {loginMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Kirish
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1 bg-primary">
        <div className="absolute inset-0 h-full w-full flex items-center justify-center p-12">
          <div className="max-w-2xl text-primary-foreground">
            <h1 className="text-5xl font-bold mb-6">Toshloq tumani 3-maktab</h1>
            <p className="text-xl opacity-80">
              Yagona ta'lim boshqaruvi platformasi. O'quvchilar, o'qituvchilar va dars jarayonlarini samarali nazorat qiling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
