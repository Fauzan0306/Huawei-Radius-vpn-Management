<script setup>
// Shared dashboard metric card so summary panels stay visually consistent.
defineProps({
  label: String,
  value: [String, Number],
  icon: String,
  badge: String,
  badgeTone: {
    type: String,
    default: "teal"
  },
  iconTone: {
    type: String,
    default: "slate"
  }
});
</script>

<template>
  <article class="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div
        class="rounded-xl p-3"
        :class="{
          'bg-blue-50 text-blue-600': iconTone === 'blue',
          'bg-emerald-50 text-accent-teal': iconTone === 'teal',
          'bg-red-50 text-red-600': iconTone === 'red',
          'bg-slate-100 text-slate-600': iconTone === 'slate'
        }"
      >
        <span class="material-symbols-outlined">{{ icon }}</span>
      </div>
      <span
        v-if="badge"
        class="rounded px-2 py-1 text-[11px] font-bold"
        :class="{
          'bg-accent-teal/10 text-accent-teal': badgeTone === 'teal',
          'bg-red-500/10 text-red-600': badgeTone === 'red',
          'bg-slate-100 text-slate-600': badgeTone === 'slate'
        }"
      >
        {{ badge }}
      </span>
    </div>

    <p class="text-sm font-medium text-slate-500">{{ label }}</p>
    <p class="mt-1 text-3xl font-bold text-slate-900">{{ value }}</p>
  </article>
</template>
