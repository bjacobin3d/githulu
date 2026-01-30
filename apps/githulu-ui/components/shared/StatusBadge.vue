<script setup lang="ts">
import { ArrowUp, ArrowDown, Circle, AlertTriangle } from 'lucide-vue-next';

const props = defineProps<{
  type: 'ahead' | 'behind' | 'dirty' | 'conflict';
  count?: number;
}>();

const config = computed(() => {
  switch (props.type) {
    case 'ahead':
      return {
        icon: ArrowUp,
        class: 'status-badge-ahead',
        title: 'Commits ahead of upstream',
      };
    case 'behind':
      return {
        icon: ArrowDown,
        class: 'status-badge-behind',
        title: 'Commits behind upstream',
      };
    case 'dirty':
      return {
        icon: Circle,
        class: 'status-badge-dirty',
        title: 'Uncommitted changes',
        fill: true,
      };
    case 'conflict':
      return {
        icon: AlertTriangle,
        class: 'status-badge-conflict',
        title: 'Conflicts',
      };
    default:
      return {
        icon: Circle,
        class: '',
        title: '',
      };
  }
});
</script>

<template>
  <span class="status-badge" :class="config.class" :title="config.title">
    <component :is="config.icon" class="h-2.5 w-2.5" :class="{ 'fill-current': config.fill }" />
    <span v-if="count !== undefined">{{ count }}</span>
  </span>
</template>
