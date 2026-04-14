<script setup>
import { computed, reactive, ref, watch, onMounted, onUnmounted } from "vue";
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

const props = defineProps({
  open: Boolean,
  mode: {
    type: String,
    default: "create"
  },
  user: {
    type: Object,
    default: null
  },
  loading: Boolean
});

const emit = defineEmits(["close", "submit"]);
const showPassword = ref(false);
const isDropdownOpen = ref(false);
const dropdownRef = ref(null);
const errorMessage = ref("");

const filterOptions = [
  { value: "", label: "-- Pilih Jalur Akses --", description: "Pilih salah satu (Wajib)" },
  { value: "VPN", label: "VPN", description: "Jalur IFORTE" },
  { value: "VPN_RADIUS", label: "VPN_RADIUS", description: "Jalur Crossnet" }
];

function getFilterIdLabel(val) {
  const opt = filterOptions.find(o => o.value === val);
  if (!opt || opt.value === "") return opt?.label || "-- Pilih Jalur Akses --";
  return `${opt.label} (${opt.description})`;
}

function selectFilter(val) {
  form.filterId = val;
  isDropdownOpen.value = false;
}

function handleClickOutside(event) {
  if (isDropdownOpen.value && dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});

const form = reactive({
  username: "",
  password: "",
  expirationDate: "",
  simultaneousUse: "",
  filterId: ""
});

watch(
  () => [props.open, props.user, props.mode],
  () => {
    errorMessage.value = "";
    form.username = props.user?.username || "";
    form.password = "";
    form.expirationDate = props.user?.expirationDate || "";
    form.simultaneousUse = props.user?.simultaneousUse || "";
    form.filterId = props.user?.filterId || "";
    showPassword.value = false;
    isDropdownOpen.value = false;
  },
  { immediate: true }
);

const modalMeta = computed(() => {
  if (props.mode === "edit") {
    return {
      icon: "edit_note",
      title: "Edit VPN User",
      description: "Update access policies and account settings for this user.",
      noteTitle: "Update Note",
      noteText: "Changes to expiration, simultaneous access, and Huawei role are applied immediately after saving.",
      submitLabel: "Save Changes"
    };
  }

  return {
    icon: "person_add",
    title: "Create VPN User",
    description: "Setup new secure credentials and define access policies.",
    noteTitle: "Security Note",
    noteText: "Newly created users become active immediately. Passwords must still follow the backend rules currently enforced by the system.",
    submitLabel: "Create User"
  };
});

function submit() {
  errorMessage.value = "";
  
  if (!form.username.trim()) {
    errorMessage.value = "Username wajib diisi!";
    return;
  }
  if (props.mode === "create" && !form.password) {
    errorMessage.value = "Password wajib diisi untuk user baru!";
    return;
  }
  if (!form.filterId) {
    errorMessage.value = "Jalur VPN (Filter-Id) wajib dipilih!";
    return;
  }

  emit("submit", {
    username: form.username,
    password: form.password,
    expirationDate: form.expirationDate,
    simultaneousUse: form.simultaneousUse,
    filterId: form.filterId
  });
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" @click="$emit('close')"></div>

    <div class="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-8 sm:py-6">
        <div class="flex gap-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-12">
            <span class="material-symbols-outlined text-2xl sm:text-3xl">{{ modalMeta.icon }}</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 sm:text-xl">{{ modalMeta.title }}</h3>
            <p class="mt-0.5 text-sm text-slate-500">
              {{ mode === "edit" ? modalMeta.description : modalMeta.description }}
            </p>
          </div>
        </div>
        <button type="button" class="p-1 text-slate-400 transition-colors hover:text-slate-600" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="overflow-y-auto px-4 py-4 sm:p-8">
        <div class="mb-6 flex gap-4 rounded-xl border border-teal-100 bg-teal-50 p-4 sm:mb-8">
          <div class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <span class="material-symbols-outlined text-[16px] font-bold">shield</span>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-semibold text-primary">{{ modalMeta.noteTitle }}</p>
            <p class="text-xs leading-relaxed text-primary/80">
              {{ modalMeta.noteText }}
            </p>
          </div>
        </div>

        <form class="space-y-6 sm:space-y-8" @submit.prevent="submit">
          <div v-show="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2 font-medium">
            <span class="material-symbols-outlined text-lg">error</span>
            {{ errorMessage }}
          </div>

          <section>
            <div class="mb-5 flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-slate-400">badge</span>
              <h4 class="text-sm font-bold uppercase tracking-wider text-slate-500">User Details</h4>
              <div class="h-px flex-1 bg-slate-100"></div>
            </div>

            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-slate-700">Username <span class="text-rose-500">*</span></span>
                <input
                  v-model="form.username"
                  :disabled="mode === 'edit'"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="e.g. dr.ahmad.h"
                />
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-slate-700">
                  Password <span v-if="mode === 'create'" class="text-rose-500">*</span>
                </span>
                <div class="relative">
                  <input
                    v-model="form.password"
                    :disabled="mode === 'edit'"
                    :type="showPassword ? 'text' : 'password'"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-500"
                    :placeholder="mode === 'create' ? 'Minimum 6 characters' : 'Use reset password button in table'"
                  />
                  <button
                    v-if="mode === 'create'"
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                    @click="showPassword = !showPassword"
                  >
                    <span class="material-symbols-outlined text-lg">{{ showPassword ? "visibility_off" : "visibility" }}</span>
                  </button>
                  <span v-else class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-300">lock</span>
                </div>
                <span v-if="mode === 'edit'" class="text-xs text-slate-400">Password is changed from the reset password action.</span>
              </label>
            </div>
          </section>

          <section>
            <div class="mb-5 flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-slate-400">key_visualizer</span>
              <h4 class="text-sm font-bold uppercase tracking-wider text-slate-500">Access Settings</h4>
              <div class="h-px flex-1 bg-slate-100"></div>
            </div>

            <div class="space-y-6">
              <label class="flex flex-col gap-2">
                <span class="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Filter-Id / Huawei Role <span class="text-rose-500">*</span></span>
                </span>
                <div class="relative" ref="dropdownRef">
                  <button
                    type="button"
                    @click="isDropdownOpen = !isDropdownOpen"
                    class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all hover:bg-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <span :class="form.filterId ? 'font-medium text-slate-800' : 'text-slate-500'">
                      {{ getFilterIdLabel(form.filterId) }}
                    </span>
                    <span 
                      class="material-symbols-outlined text-lg text-slate-400 transition-transform duration-200" 
                      :class="{ 'rotate-180': isDropdownOpen }"
                    >expand_more</span>
                  </button>

                  <transition
                    enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0"
                    enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-in"
                    leave-from-class="transform scale-100 opacity-100"
                    leave-to-class="transform scale-95 opacity-0"
                  >
                    <div v-show="isDropdownOpen" class="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
                      <ul class="py-1">
                        <li
                          v-for="option in filterOptions"
                          :key="option.value"
                          @click="selectFilter(option.value)"
                          class="flex cursor-pointer items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                          :class="form.filterId === option.value ? 'bg-primary/5 text-primary' : 'text-slate-700'"
                        >
                          <div class="flex flex-col">
                            <span class="font-bold">{{ option.label }}</span>
                            <span v-if="option.description" class="mt-0.5 text-[11px] font-medium text-slate-500 uppercase tracking-widest">{{ option.description }}</span>
                          </div>
                          <span v-if="form.filterId === option.value" class="material-symbols-outlined text-base">check_circle</span>
                        </li>
                      </ul>
                    </div>
                  </transition>
                </div>
              </label>

              <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label class="flex flex-col gap-2">
                  <span class="flex items-center justify-between text-sm font-semibold text-slate-700">
                    Expiration Date
                    <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Optional</span>
                  </span>
                  <VueDatePicker
                    v-model="form.expirationDate"
                    :enable-time-picker="false"
                    auto-apply
                    model-type="yyyy-MM-dd"
                    format="yyyy-MM-dd"
                    placeholder="Select expiration date"
                    class="custom-datepicker"
                  />
                </label>

                <label class="flex flex-col gap-2">
                  <span class="flex items-center justify-between text-sm font-semibold text-slate-700">
                    Simultaneous-Use
                    <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Optional</span>
                  </span>
                  <input
                    v-model="form.simultaneousUse"
                    type="number"
                    min="1"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="1"
                  />
                </label>
              </div>
            </div>
          </section>
        </form>
      </div>

      <div class="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8 sm:py-6">
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
          <span>{{ loading ? "Saving..." : modalMeta.submitLabel }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-datepicker {
  --dp-background-color: #f8fafc; /* bg-slate-50 */
  --dp-text-color: #334155; /* text-slate-700 */
  --dp-border-color: #e2e8f0; /* bg-slate-200 */
  --dp-border-color-hover: #0f766e; /* primary: teal-700 */
  --dp-border-color-focus: #0f766e;
  --dp-primary-color: #0f766e;
  --dp-primary-text-color: #fff;
  --dp-border-radius: 0.75rem; /* rounded-xl */
  --dp-font-family: inherit;
  --dp-font-size: 0.875rem; /* text-sm */
  --dp-input-padding: 0.625rem 1rem; /* px-4 py-2.5 approx */
}

/* Force ring effect on focus */
.custom-datepicker:focus-within {
  --dp-border-color: #0f766e;
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.2);
  border-radius: var(--dp-border-radius);
}
</style>
