import { Editor } from "@tiptap/core";
import { getCollaborationExtensions } from "novel/extensions";
import { defaultExtensions } from "./extensions";

// FIXME: avoid core import in app
export function createAgentEditor(documentId: string, name: string, color: string) {
  return new Editor({
    extensions: [...defaultExtensions, ...getCollaborationExtensions(documentId, name, color)],
    autofocus: "end",
  });
}
