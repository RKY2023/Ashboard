import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userRegistrationSchema } from "@/lib/validation";
import type { UserRegistration } from "@/lib/validation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Header from "@/components/ui/Header/Header";
import { useState } from "react";

const CreateUser = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<UserRegistration>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phoneno: "",
    },
  });

  const onSubmit = async (data: UserRegistration) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/createUser', {
        method: "POST",
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        form.reset();
      } else {
        setError(result.error?.msg || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-md">
        {error && (
          <div className="text-red-600 mb-4 p-3 border border-red-300 rounded-md bg-red-50">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-600 mb-4 p-3 border border-green-300 rounded-md bg-green-50">
            Account created successfully!
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="phoneno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Phone Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
};

export default CreateUser;
