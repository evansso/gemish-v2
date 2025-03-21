import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";
import { Button } from "../ui/button";
import { Paperclip, ArrowUpIcon, Loader2Icon, Square } from "lucide-react";
import { type DebouncedState } from "use-debounce";
import { ChatInputFiles } from "./chat-input-files";
import { useChat } from "@/providers/chat-provider";

interface ChatInputProps {
  input: string;
  handleValueChange: (value: string) => void;
  status: "submitted" | "streaming" | "ready" | "error";
  handleSend: DebouncedState<() => Promise<void>>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  stop: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileList: File[];
  removeFile: (file: File) => void;
}

export function ChatInput({
  input,
  status,
  handleValueChange,
  handleSend,
  handleKeyDown,
  stop,
  fileInputRef,
  handleFileChange,
  fileList,
}: ChatInputProps) {
  const { isUploading } = useChat();

  return (
    <PromptInput
      className="border-input bg-background border shadow-xs"
      value={input}
      onValueChange={handleValueChange}
      onSubmit={handleSend}
    >
      {fileList.length > 0 && <ChatInputFiles />}
      <PromptInputTextarea
        placeholder="Ask anything..."
        className="min-h-[55px] dark:text-white text-black"
        onKeyDown={handleKeyDown}
        disabled={status !== "ready"}
      />
      <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
        <PromptInputAction tooltip="Attach files">
          <Button
            size="sm"
            variant={"outline"}
            className="h-9 w-9 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={status !== "ready"}
          >
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              multiple
              ref={fileInputRef}
            />
            <Paperclip className=" size-5" />
          </Button>
        </PromptInputAction>

        <div className="flex items-center gap-2">
          <PromptInputAction
            tooltip={
              status === "submitted" ? "Submitting..."
              : status === "streaming" ?
                "Stop generating"
              : "Send message"
            }
          >
            {status === "submitted" ?
              <Button
                size="sm"
                className="lg:h-9 lg:w-9 h-8 w-8 rounded-full"
                disabled
              >
                <Loader2Icon className="lg:size-5 size-4 animate-spin" />
              </Button>
            : status === "streaming" ?
              <Button size="sm" className="h-9 w-9 rounded-full" onClick={stop}>
                <Square className="lg:size-4 size-3 fill-current" />
              </Button>
            : <Button
                size="sm"
                className="lg:h-9 lg:w-9 h-8 w-8 rounded-full"
                onClick={handleSend}
                disabled={!input.trim() || isUploading}
              >
                <ArrowUpIcon className="lg:size-5 size-4" />
              </Button>
            }
          </PromptInputAction>
        </div>
      </PromptInputActions>
    </PromptInput>
  );
}
