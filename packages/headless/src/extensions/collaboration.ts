import { TiptapCollabProvider } from "@hocuspocus/provider";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCursor } from "@tiptap/extension-collaboration-cursor";
import { IndexeddbPersistence } from "y-indexeddb";

const providers: {
  [documentId: string]: {
    [userId: string]: TiptapCollabProvider;
  };
} = {};

export const getProvider = (documentId: string, userId: string) => {
  if (!providers[documentId]) {
    providers[documentId] = {};
  }

  // FIXME: The nullish coalescing is a hack to avoid TS errors
  const documentProvider = providers[documentId] ?? {};

  if (documentProvider[userId]) {
    return documentProvider[userId];
  }

  const provider = new TiptapCollabProvider({
    name: documentId,
    appId: process.env.TIPTAP_CLOUD_APP_ID ?? "",
    token: process.env.TIPTAP_CLOUD_TOKEN ?? "",
  });

  documentProvider[userId] = provider;
  const idbPersistence = new IndexeddbPersistence(documentId, provider.document);
  idbPersistence.on("synced", () => {
    console.log("Local document synced");
  });

  return provider;
};

export const getCollaborationExtensions = (documentId: string, userId: string, color: string) => {
  const provider = getProvider(documentId, userId);

  return [
    Collaboration.configure({
      document: provider?.document,
    }),
    CollaborationCursor.configure({
      provider: provider,
      user: {
        name: userId,
        color,
      },
    }),
  ];
};
