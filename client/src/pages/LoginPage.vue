<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../lib/api";

const router = useRouter();
const currentYear = new Date().getFullYear();
const form = reactive({
  username: "",
  password: ""
});
const loading = ref(false);
const errorMessage = ref("");

onMounted(() => {
  document.title = "Kemenkes RSUP Makassar | VPN Login";
});

async function submit() {
  loading.value = true;
  errorMessage.value = "";

  try {
    // Successful login sets the auth cookie on the server, then the router guard handles the rest.
    await api.post("/api/auth/login", form);
    router.push("/");
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-screen flex-col overflow-hidden md:flex-row">
    <section class="relative hidden items-center justify-center overflow-hidden bg-ink px-12 py-14 text-white md:flex md:w-1/2 lg:w-3/5">
      <div class="hero-pattern absolute inset-0 opacity-50"></div>
      <div class="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-[120px]"></div>
      <div class="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]"></div>

      <div class="relative z-10 max-w-xl">
        <div class="mb-8">
          <div class="mb-6 flex items-center gap-4">
            <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-teal-950/40">
              <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </div>
            <span class="text-sm font-bold uppercase tracking-[0.32em] text-teal-300">VPN User Management</span>
          </div>

          <h1 class="text-5xl font-extrabold tracking-tight text-white">Kemenkes RSUP Makassar</h1>
          <p class="mt-4 text-xl leading-relaxed text-slate-400">Secure administrative VPN portal for hospital access management.</p>
        </div>

        <div class="mt-12 flex flex-wrap gap-6 border-t border-white/10 pt-12">
          <div class="flex items-center gap-2 text-sm text-slate-400">
            <svg class="h-5 w-5 text-teal-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M2.166 4.9 10 .303 17.834 4.9c.319.187.499.52.499.883v8.434c0 .363-.18.696-.5.886L10 19.697l-7.834-4.594a1.044 1.044 0 0 1-.5-.886V5.783c0-.363.18-.696.5-.886ZM10 2.45 4.167 5.875v7.21L10 16.51l5.833-3.425v-7.21L10 2.45Z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Hospital network protected</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-slate-400">
            <svg class="h-5 w-5 text-teal-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Enterprise encrypted traffic</span>
          </div>
        </div>
      </div>
    </section>

    <section class="relative flex flex-1 items-center justify-center bg-panel px-6 py-10 md:px-10">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-teal-100/50 to-transparent md:hidden"></div>

      <div class="fade-in-up relative z-10 w-full max-w-md">
        <div class="mb-10 text-center md:hidden">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ink">
            <svg class="h-6 w-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-ink">Kemenkes RSUP Makassar</h2>
          <p class="mt-2 text-sm text-slate-500">VPN administrative access</p>
        </div>

        <div class="rounded-[28px] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] md:p-10">
          <header class="mb-8">
            <p class="text-xs font-semibold uppercase tracking-[0.32em] text-accent">Secure Access</p>
            <h2 class="mt-3 text-3xl font-bold text-slate-800">Admin Login</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">Please enter your hospital credentials to proceed.</p>
          </header>

          <form class="space-y-6" @submit.prevent="submit">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700" for="username">Username</label>
              <input
                id="username"
                v-model="form.username"
                type="text"
                autocomplete="username"
                class="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-accent"
                placeholder="e.g. it_admin_jdoe"
              />
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <label class="block text-sm font-semibold text-slate-700" for="password">Password</label>
                <span class="text-xs font-medium text-accent">Session timeout is managed by server</span>
              </div>
              <input
                id="password"
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                class="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-accent"
                placeholder="••••••••"
              />
            </div>

            <div class="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div class="mr-3 h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
              Access is restricted to authorized hospital administrators.
            </div>

            <p v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {{ errorMessage }}
            </p>

            <button
              type="submit"
              class="w-full rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-md transition duration-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-400"
              :disabled="loading"
            >
              {{ loading ? "Signing in..." : "Sign In" }}
            </button>
          </form>

          <footer class="mt-8 text-center">
            <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Secure Administrative Access Only</p>
          </footer>
        </div>

        <div class="mt-8 text-center">
          <p class="text-sm text-slate-500">© {{ currentYear }} Kemenkes RSUP Makassar. All rights reserved.</p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hero-pattern {
  background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
  background-size: 40px 40px;
}

.fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
