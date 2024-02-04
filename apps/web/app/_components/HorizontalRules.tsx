import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { InputRule } from "@tiptap/core";

export const horizontalRule = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        handler: ({ state, range }) => {
          const attributes = {};

          const { tr } = state;
          const start = range.from;
          let end = range.to;

          tr.insert(start - 1, this.type.create(attributes)).delete(
            tr.mapping.map(start),
            tr.mapping.map(end),
          );
        },
      }),
    ];
  },
}).configure({
  HTMLAttributes: {
    class: "mt-4 mb-6 border-t border-stone-300",
  },
});
