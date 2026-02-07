<script setup lang="ts">
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import type { Component } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    icon: Component;
    label: string;
    badge?: string | number | null;
    modelValue?: boolean;
    variant?: 'section' | 'item';
  }>(),
  {
    badge: undefined,
    modelValue: true,
    variant: 'section',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function toggle() {
  emit('update:modelValue', !props.modelValue);
}
</script>

<template>
  <div>
    <button
      v-bind="$attrs"
      class="flex w-full items-center text-left rounded-md"
      :class="[
        variant === 'section'
          ? 'text-2xs gap-1 px-2 py-1 font-semibold uppercase text-slate-500 hover:text-slate-400'
          : 'hover:bg-bg-hover gap-2 py-1.5 transition-colors',
      ]"
      @click="toggle"
    >
      <component
        :is="modelValue ? ChevronDown : ChevronRight"
        class="h-3 w-3 flex-shrink-0"
        :class="variant === 'item' ? 'text-slate-500' : ''"
      />
      <component
        :is="icon"
        class="flex-shrink-0"
        :class="variant === 'section' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-slate-400'"
      />
      <span class="flex-1" :class="variant === 'item' ? 'text-sm text-slate-300' : ''">
        {{ label }}
      </span>
      <span v-if="badge != null" :class="variant === 'section' ? 'text-slate-600' : ''">
        {{ badge }}
      </span>
    </button>
    <div v-if="modelValue">
      <slot />
    </div>
  </div>
</template>
