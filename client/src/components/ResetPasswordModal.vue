<script setup>
import { reactive, ref, watch } from "vue";

const props = defineProps({
  open: Boolean,
  user: {
    type: Object,
    default: null
  },
  loading: Boolean
});

const emit = defineEmits(["close", "submit"]);
const showPassword = ref(false);

const form = reactive({
  password: ""
});

watch(
  () => props.open,
  () => {
    // Always reset sensitive input when the modal opens or reopens.
    form.password = "";
    showPassword.value = false;
  }
);

function submit() {
  // Validation stays in the page/backend so this modal remains lightweight.
  emit("submit", { password: form.password });
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" @click="$emit('close')"></div>

    <div class="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-8 sm:py-6">
        <div class="flex gap-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-12">
            <span class="material-symbols-outlined text-2xl sm:text-3xl">lock_reset</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 sm:text-xl">Reset Password</h3>
            <p class="mt-0.5 text-sm text-slate-500">Create a new password credential for this VPN account.</p>
          </div>
        </div>
        <button
          type="button"
          class="p-1 text-slate-400 transition-colors hover:text-slate-600"
          @click="$emit('close')"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="space-y-6 px-4 py-4 sm:space-y-8 sm:p-8">
        <div class="flex gap-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
          <div class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <span class="material-symbols-outlined text-[16px] font-bold">shield</span>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-semibold text-primary">Password Update Note</p>
            <p class="text-xs leading-relaxed text-primary/80">
              The new password will replace the current credential immediately after submission. Keep it aligned with your existing backend password policy.
            </p>
          </div>
        </div>

        <section>
          <div class="mb-5 flex items-center gap-3">
            <span class="material-symbols-outlined text-xl text-slate-400">password</span>
            <h4 class="text-sm font-bold uppercase tracking-wider text-slate-500">Credential Reset</h4>
            <div class="h-px flex-1 bg-slate-100"></div>
          </div>

          <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-5">
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Target User</p>
            <p class="mt-2 text-lg font-bold text-slate-900">{{ user?.username }}</p>
          </div>
        </section>

        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-slate-700">New Password</span>
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Minimum 6 characters"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
              @click="showPassword = !showPassword"
            >
              <span class="material-symbols-outlined text-lg">{{ showPassword ? "visibility_off" : "visibility" }}</span>
            </button>
          </div>
        </label>
      </div>

      <div class="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8 sm:py-6">
        <button
          type="button"
          class="w-full rounded-xl border border-slate-200 px-6 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-white sm:w-auto"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-2.5 font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-accent-teal disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          :disabled="loading"
          @click="submit"
        >
          <span>{{ loading ? "Updating..." : "Reset Password" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
