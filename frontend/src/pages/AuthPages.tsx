import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/form'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const loginSchema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Password is required') })
const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a digit'),
})

export function LoginForm({ onDone }: { onDone: (role: string) => void }) {
  const { login } = useAuth()
  const [error, setError] = useState<string>()
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit(async (v) => {
        setError(undefined)
        try { onDone((await login(v.email, v.password)).role) } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not sign in') }
      })}
    >
      <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
        <Input id="login-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
        <Input id="login-password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
      </Field>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
    </form>
  )
}

export function RegisterForm({ onDone }: { onDone: () => void }) {
  const { register: signUp } = useAuth()
  const [error, setError] = useState<string>()
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) })
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit(async (v) => {
        setError(undefined)
        try {
          await signUp({ ...v, phone: v.phone || undefined })
          onDone()
        } catch (e) {
          if (e instanceof ApiError && Object.keys(e.fieldErrors).length > 0) {
            Object.entries(e.fieldErrors).forEach(([k, msgs]) => setFieldError(k as keyof z.infer<typeof registerSchema>, { message: msgs[0] }))
          } else setError(e instanceof ApiError ? e.message : 'Could not create the account')
        }
      })}
    >
      <Field label="Full name" htmlFor="reg-name" error={errors.fullName?.message}>
        <Input id="reg-name" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
      </Field>
      <Field label="Email" htmlFor="reg-email" error={errors.email?.message}>
        <Input id="reg-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label="Phone (optional)" htmlFor="reg-phone" error={errors.phone?.message}>
        <Input id="reg-phone" type="tel" autoComplete="tel" {...register('phone')} />
      </Field>
      <Field label="Password" htmlFor="reg-password" error={errors.password?.message} hint="At least 8 characters with a letter and a digit">
        <Input id="reg-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
      </Field>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
    </form>
  )
}

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="container flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-md animate-fade-up p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {children}
        <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
      </Card>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your bookings." footer={<>New here? <Link className="font-medium text-primary hover:underline" to="/register" state={{ from }}>Create an account</Link></>}>
      <LoginForm onDone={(role) => navigate(from ?? (role === 'Customer' ? '/my-bookings' : '/admin'), { replace: true })} />
      <p className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">Demo: customer@demo.com / Customer123! &middot; admin@demo.com / Admin123!</p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  return (
    <AuthShell title="Create your account" subtitle="Book in seconds and manage appointments anytime." footer={<>Already registered? <Link className="font-medium text-primary hover:underline" to="/login" state={{ from }}>Sign in</Link></>}>
      <RegisterForm onDone={() => navigate(from ?? '/my-bookings', { replace: true })} />
    </AuthShell>
  )
}
