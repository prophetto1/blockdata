<script setup lang="ts">
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { SessionMode } from '@/store/sessionMode';
import AceEditor from '@/components/panels/code-editor/AceEditor.vue';
import GuiEditorPanelJsonSchema from '@/components/panels/gui-editor/GuiEditorPanelJsonSchema.vue';
</script>

<template>
  <div class="w-full h-full">
    <Splitter class="h-full" style="min-width: 0" layout="horizontal">
      <SplitterPanel :min-size="10" :size="50">
        <AceEditor :sessionMode="SessionMode.SchemaEditor" />
      </SplitterPanel>
      <SplitterPanel :min-size="10" :size="50">
        <GuiEditorPanelJsonSchema :sessionMode="SessionMode.SchemaEditor" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style scoped></style>

