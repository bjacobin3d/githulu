<script setup lang="ts">
import type { Component } from 'vue';

const props = withDefaults(
  defineProps<{
    icon: Component;
    label: string;
    size?: 'xs' | 'sm';
    selected?: boolean;
    badge?: string | number | null;
    iconClass?: string;
  }>(),
  {
    size: 'sm',
    selected: false,
    badge: undefined,
    iconClass: undefined,
  }
);

const iconSizeClass = computed(() =>
  props.iconClass ?? (props.size === 'xs' ? 'h-3 w-3' : 'h-4 w-4')
);

const textSizeClass = computed(() => (props.size === 'xs' ? 'text-xs' : 'text-sm'));
</script>

<template>
  <button
    class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
    :class="[
      selected
        ? 'bg-primary-900/40 text-primary-300'
        : 'hover:bg-bg-hover text-slate-300',
    ]"
  >
    <slot name="prefix" />
    <component :is="icon" class="flex-shrink-0" :class="iconSizeClass" />
    <span class="flex-1 truncate" :class="textSizeClass">
      <slot>{{ label }}</slot>
    </span>
    <slot name="right">
      <span
        v-if="badge != null"
        class="text-2xs bg-primary-500/20 text-primary-400 rounded px-1.5 py-0.5"
      >
        {{ badge }}
      </span>
    </slot>
  </button>
</template>
