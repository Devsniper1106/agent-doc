"use client";
import { defaultEditorContent } from "@/lib/content";
import { cn } from "@/lib/utils";
import { useCompletion } from "ai/react";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  type JSONContent,
} from "novel";
import {
  Comment as CommentExt,
  ImageResizer,
  getCollaborationExtensions,
  handleCommandNavigation,
} from "novel/extensions";
import { handleImageDrop, handleImagePaste } from "novel/plugins";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { createAgentEditor } from "./agent-editor";
import Comments from "./comments";
import type { Comment } from "./comments";
import { DEFAULT_DOCUMENT_ID } from "./constants";
import { defaultExtensions } from "./extensions";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { ColorSelector } from "./selectors/color-selector";
import CommentSelector from "./selectors/comment-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";
import { Separator } from "./ui/separator";

const hljs = require("highlight.js");

const agentName = "Homelander";
const agentEditor = createAgentEditor(DEFAULT_DOCUMENT_ID, agentName, "#F98181");
const collaborationExtensions = getCollaborationExtensions(DEFAULT_DOCUMENT_ID, "Human", "#abcdef");

const TailwindAdvancedEditor = () => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<null | string>(null);

  const { completion, complete, isLoading } = useCompletion({
    // id: "novel",
    api: "/api/generate",
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        return;
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const extensions = [
    ...defaultExtensions,
    ...collaborationExtensions,
    slashCommand,
    CommentExt.configure({
      HTMLAttributes: {
        class: cn("bg-yellow-400 bg-opacity-50"),
      },
      onCommentActivated: setActiveCommentId,
    }),
  ];

  function addComment(id: string) {
    setComments([
      ...comments,
      {
        id: id,
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function removeComment(id: string) {
    setComments(comments.filter((comment) => comment.id !== id));
  }

  function updateComment(id: string, content: string) {
    setComments(
      comments.map((comment) => {
        if (comment.id === id) {
          return {
            ...comment,
            content: content,
          };
        }
        return comment;
      }),
    );
  }

  function removeCommentsWithoutMarks(editor: EditorInstance) {
    const { doc } = editor.state;
    const commentIds = new Set();
    doc.descendants((node) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === "comment" && mark.attrs.commentId) {
          commentIds.add(mark.attrs.commentId);
        }
      });
    });
    setComments(comments.filter((comment) => commentIds.has(comment.id)));
  }

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    doc.querySelectorAll("pre code").forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.words());
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());

    setSaveStatus("Saved");
  }, 500);

  const debouncedCommentSave = useDebouncedCallback(async () => {
    window.localStorage.setItem("comments", JSON.stringify(comments));
  }, 500);

  useEffect(() => {
    const content = window.localStorage.getItem("novel-content");
    if (content) setInitialContent(JSON.parse(content));
    else setInitialContent(defaultEditorContent);

    const comments = window.localStorage.getItem("comments");
    if (comments) setComments(JSON.parse(comments));
    else setComments([]);
  }, []);

  useEffect(() => {
    debouncedCommentSave();
  }, [comments]);

  if (!initialContent) return null;

  return (
    <div className="flex w-full space-x-4">
      <div className="relative w-full max-w-screen-lg">
        <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
          <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">{saveStatus}</div>
          <div className={charsCount ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground" : "hidden"}>
            {charsCount} Words
          </div>
        </div>
        <EditorRoot>
          <EditorContent
            initialContent={initialContent}
            extensions={extensions}
            className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
            editorProps={{
              handleDOMEvents: {
                keydown: (_view, event) => handleCommandNavigation(event),
              },
              handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
              handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
              attributes: {
                class:
                  "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
              },
            }}
            onUpdate={({ editor }) => {
              debouncedUpdates(editor);
              setSaveStatus("Unsaved");
              removeCommentsWithoutMarks(editor);
            }}
            slotAfter={<ImageResizer />}
          >
            <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
              <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
              <EditorCommandList>
                {suggestionItems.map((item) => (
                  <EditorCommandItem
                    value={item.title}
                    onCommand={(val) => item.command(val)}
                    className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                    key={item.title}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </EditorCommandItem>
                ))}
              </EditorCommandList>
            </EditorCommand>

            <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
              <Separator orientation="vertical" />
              <NodeSelector open={openNode} onOpenChange={setOpenNode} />
              <Separator orientation="vertical" />

              <LinkSelector open={openLink} onOpenChange={setOpenLink} />
              <Separator orientation="vertical" />
              <MathSelector />
              <Separator orientation="vertical" />
              <TextButtons />
              <CommentSelector onAddComment={addComment} onRemoveComment={removeComment} />
              <Separator orientation="vertical" />
              <ColorSelector open={openColor} onOpenChange={setOpenColor} />
            </GenerativeMenuSwitch>
          </EditorContent>
        </EditorRoot>
      </div>
      <Comments activeCommentId={activeCommentId} comments={comments} updateComments={updateComment} />
    </div>
  );
};

export default TailwindAdvancedEditor;
