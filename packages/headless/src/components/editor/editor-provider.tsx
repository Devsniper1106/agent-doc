"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import {
  useEditor,
  EditorContent,
  JSONContent,
  Extension,
  EditorProvider as TipTapEditorProvider,
} from "@tiptap/react";
import { useDebouncedCallback } from "use-debounce";
import { useCompletion } from "ai/react";
import { toast } from "sonner";
import va from "@vercel/analytics";
import { EditorProps as TipTapEditorProps } from "@tiptap/pm/view";
import { Editor as EditorClass } from "@tiptap/core";
import { defaultEditorProps } from "./defaultProps";
import { DefaultExtensionsStylingOptions, createDefaultExensions } from "../../extensions";
import { defaultEditorContent } from "../../defaults/default-editor-content";
import useLocalStorage from "../../hooks/use-local-storage";
import { getPrevText } from "../../utils/utils";
import { ImageResizer } from "../../extensions/image-resizer";

interface EditorProps {
  /**
   * The API route to use for the OpenAI completion API.
   * Defaults to "/api/generate".
   */
  completionApi?: string;
  /**
   * Additional classes to add to the editor container.
   * Defaults to "relative min-h-[500px] w-full max-w-screen-lg border-stone-200 bg-white sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg".
   */
  className?: string;
  /**
   * The default value to use for the editor.
   * Defaults to defaultEditorContent.
   */
  defaultValue?: JSONContent | string;
  /**
   * A list of extensions to use for the editor, in addition to the default Novel extensions.
   * Defaults to [].
   */
  extensions?: Extension[];
  /**
   * Props to pass to the underlying Tiptap editor, in addition to the default Novel editor props.
   * Defaults to {}.
   */
  editorProps?: TipTapEditorProps;
  /**
   * A callback function that is called whenever the editor is updated.
   * Defaults to () => {}.
   */
  // eslint-disable-next-line no-unused-vars
  onUpdate?: (editor?: EditorClass) => void | Promise<void>;
  /**
   * A callback function that is called whenever the editor is updated, but only after the defined debounce duration.
   * Defaults to () => {}.
   */
  // eslint-disable-next-line no-unused-vars
  onDebouncedUpdate?: (editor?: EditorClass) => void | Promise<void>;
  /**
   * The duration (in milliseconds) to debounce the onDebouncedUpdate callback.
   * Defaults to 750.
   */
  debounceDuration?: number;
  /**
   * The key to use for storing the editor's value in local storage.
   * Defaults to "novel__content".
   */
  storageKey?: string;
  /**
   * The key to use for storing the editor's value in local storage.
   * Defaults to "novel__content".
   */
  children?: ReactNode;
  defaultStylingOptions: DefaultExtensionsStylingOptions;
}

const EditorProvider = ({
  completionApi = "/api/generate",
  className = "relative min-h-[500px] w-full max-w-screen-lg border-stone-200 bg-white sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg",
  defaultValue = defaultEditorContent,
  extensions = [],
  editorProps = {},
  onUpdate = () => {},
  onDebouncedUpdate = () => {},
  debounceDuration = 750,
  storageKey = "novel__content",
  children,
  defaultStylingOptions,
}: EditorProps) => {
  const [content, setContent] = useLocalStorage(storageKey, defaultValue);
  const [editor, setEditor] = useState<EditorClass | null>();

  const [hydrated, setHydrated] = useState(false);

  const debouncedUpdates = useDebouncedCallback(async ({ editor }) => {
    const json = editor.getJSON();
    setContent(json);
    onDebouncedUpdate(editor);
  }, debounceDuration);

  const { complete, completion, isLoading, stop } = useCompletion({
    id: "novel",
    api: completionApi,
    onFinish: (_prompt, completion) => {
      editor?.commands.setTextSelection({
        from: editor.state.selection.from - completion.length,
        to: editor.state.selection.from,
      });
    },
    onError: (err) => {
      toast.error(err.message);
      if (err.message === "You have reached your request limit for the day.") {
        va.track("Rate Limit Reached");
      }
    },
  });

  const prev = useRef("");

  // Insert chunks of the generated text
  useEffect(() => {
    const diff = completion.slice(prev.current.length);
    prev.current = completion;
    editor?.commands.insertContent(diff);
  }, [isLoading, editor, completion]);

  useEffect(() => {
    // if user presses escape or cmd + z and it's loading,
    // stop the request, delete the completion, and insert back the "++"
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.metaKey && e.key === "z")) {
        stop();
        if (e.key === "Escape") {
          editor?.commands.deleteRange({
            from: editor.state.selection.from - completion.length,
            to: editor.state.selection.from,
          });
        }
        editor?.commands.insertContent("++");
      }
    };
    const mousedownHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      stop();
      if (window.confirm("AI writing paused. Continue?")) {
        complete(editor?.getText() || "");
      }
    };
    if (isLoading) {
      document.addEventListener("keydown", onKeyDown);
      window.addEventListener("mousedown", mousedownHandler);
    } else {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", mousedownHandler);
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", mousedownHandler);
    };
  }, [stop, isLoading, editor, complete, completion.length]);

  // Hydrate the editor with the content from localStorage.
  useEffect(() => {
    if (editor && content && !hydrated) {
      editor.commands.setContent(content);
      setHydrated(true);
    }
  }, [editor, content, hydrated]);

  return (
    <div
      onClick={() => {
        editor?.chain().focus().run();
      }}
      className={className}>
      <TipTapEditorProvider
        extensions={[...createDefaultExensions(defaultStylingOptions), ...extensions]}
        editorProps={{
          ...defaultEditorProps,
          ...editorProps,
        }}
        onCreate={(e) => setEditor(e.editor)}
        onUpdate={(e) => {
          const selection = e.editor.state.selection;
          const lastTwo = getPrevText(e.editor, {
            chars: 2,
          });
          if (lastTwo === "++" && !isLoading) {
            e.editor.commands.deleteRange({
              from: selection.from - 2,
              to: selection.from,
            });
            complete(
              getPrevText(e.editor, {
                chars: 5000,
              })
            );
            // complete(e.editor.storage.markdown.getMarkdown());
            va.track("Autocomplete Shortcut Used");
          } else {
            onUpdate(e.editor);
            debouncedUpdates(e);
          }
        }}
        autofocus='end'
        content={defaultEditorContent}
        slotBefore={<ImageResizer />}>
        {children}
      </TipTapEditorProvider>
    </div>
  );
};
export default EditorProvider;
