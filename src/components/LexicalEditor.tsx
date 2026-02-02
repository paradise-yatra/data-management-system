import { ComponentProps, useEffect, useState, useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import {
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    UNDO_COMMAND,
    REDO_COMMAND,
    TextFormatType,
    ElementFormatType,
    SELECTION_CHANGE_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    $createParagraphNode,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode, $isHeadingNode } from "@lexical/rich-text";
import { $isListNode, $createListNode } from "@lexical/list";
import { $createCodeNode } from "@lexical/code";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $getNearestNodeOfType } from "@lexical/utils";
import { $patchStyleText } from "@lexical/selection";
import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Undo,
    Redo,
    Type,
    Link2,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    List,
    ListOrdered,
    ImagePlus,
    Minus,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

// Theme-aware Lexical theme classes using Tailwind CSS variables
const theme = {
    ltr: "ltr",
    rtl: "rtl",
    placeholder: "editor-placeholder",
    paragraph: "mb-4 leading-relaxed",
    quote: "border-l-4 border-primary pl-4 italic text-muted-foreground my-4",
    heading: {
        h1: "text-4xl font-bold mb-6 mt-8 text-foreground",
        h2: "text-3xl font-semibold mb-4 mt-6 text-foreground",
        h3: "text-2xl font-semibold mb-3 mt-5 text-foreground",
    },
    list: {
        nested: {
            listitem: "list-none",
        },
        ol: "list-decimal list-inside ml-4 space-y-1 my-4",
        ul: "list-disc list-inside ml-4 space-y-1 my-4",
        listitem: "leading-relaxed",
    },
    image: "rounded-lg overflow-hidden shadow-md my-6 max-w-full",
    link: "text-primary underline underline-offset-2 hover:text-primary/80 transition-colors cursor-pointer",
    text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        underlineStrikethrough: "underline line-through",
        code: "bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-sm",
    },
    code: "bg-muted text-foreground p-4 rounded-lg font-mono text-sm border border-border my-4 block overflow-x-auto",
};

// Placeholder component
function Placeholder() {
    return (
        <div className="pointer-events-none absolute top-0 left-0 text-muted-foreground/50 select-none">
            Start writing your content here...
        </div>
    );
}

// Toolbar Button Component
interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    tooltip: string;
    children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, tooltip, children }: ToolbarButtonProps) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-md transition-colors",
                            isActive && "bg-accent text-accent-foreground"
                        )}
                        onClick={onClick}
                        disabled={disabled}
                    >
                        {children}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Main Toolbar Plugin
const ToolbarPlugin = () => {
    const [editor] = useLexicalComposerContext();
    const [activeEditor, setActiveEditor] = useState(editor);
    const [blockType, setBlockType] = useState("paragraph");
    const [fontSize, setFontSize] = useState(16);
    const [fontSizeInput, setFontSizeInput] = useState("16");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [isLink, setIsLink] = useState(false);

    useEffect(() => {
        setFontSizeInput(fontSize.toString());
    }, [fontSize]);

    // Update toolbar state based on selection
    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            const element =
                anchorNode.getKey() === "root"
                    ? anchorNode
                    : anchorNode.getTopLevelElementOrThrow();
            const elementKey = element.getKey();
            const elementDOM = activeEditor.getElementByKey(elementKey);

            if (elementDOM !== null) {
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                    const type = parentList ? parentList.getListType() : element.getListType();
                    setBlockType(type === "bullet" ? "ul" : "ol");
                } else {
                    const type = $isHeadingNode(element)
                        ? element.getTag()
                        : element.getType();
                    setBlockType(type);
                }
            }

            setIsBold(selection.hasFormat("bold"));
            setIsItalic(selection.hasFormat("italic"));
            setIsUnderline(selection.hasFormat("underline"));
            setIsCode(selection.hasFormat("code"));
        }
    }, [activeEditor]);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (_payload, newEditor) => {
                updateToolbar();
                setActiveEditor(newEditor);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor, updateToolbar]);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                updateToolbar();
            });
        });
    }, [editor, updateToolbar]);

    // Format block type
    const formatBlock = (type: string) => {
        if (blockType === type) return;

        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => {
                    switch (type) {
                        case "h1":
                            return $createHeadingNode("h1");
                        case "h2":
                            return $createHeadingNode("h2");
                        case "h3":
                            return $createHeadingNode("h3");
                        case "quote":
                            return $createQuoteNode();
                        case "code":
                            return $createCodeNode();
                        case "ul":
                            return $createListNode("bullet");
                        case "ol":
                            return $createListNode("number");
                        default:
                            return $createParagraphNode();
                    }
                });
            }
        });
    };

    // Format text
    const formatText = (format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    // Format element alignment
    const formatElement = (format: ElementFormatType) => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
    };

    // Apply font size
    const applyFontSize = (size: number) => {
        setFontSize(size);
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $patchStyleText(selection, { "font-size": `${size}px` });
            }
        });
    };

    // Insert link
    const insertLink = () => {
        const url = prompt("Enter URL:");
        if (url) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        }
    };

    const blockTypeLabels: Record<string, string> = {
        paragraph: "Paragraph",
        h1: "Heading 1",
        h2: "Heading 2",
        h3: "Heading 3",
        quote: "Quote",
        code: "Code Block",
        ul: "Bullet List",
        ol: "Numbered List",
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-card border border-border rounded-lg mb-4">
            {/* Undo / Redo */}
            <ToolbarButton
                onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                tooltip="Undo (Ctrl+Z)"
            >
                <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                tooltip="Redo (Ctrl+Y)"
            >
                <Redo className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Block Type Selector */}
            <Select value={blockType} onValueChange={formatBlock}>
                <SelectTrigger className="h-8 w-[130px] text-xs bg-background border-input">
                    <SelectValue>
                        {blockTypeLabels[blockType] || "Paragraph"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="paragraph">Paragraph</SelectItem>
                    <SelectItem value="h1">
                        <div className="flex items-center gap-2">
                            <Heading1 className="h-4 w-4" /> Heading 1
                        </div>
                    </SelectItem>
                    <SelectItem value="h2">
                        <div className="flex items-center gap-2">
                            <Heading2 className="h-4 w-4" /> Heading 2
                        </div>
                    </SelectItem>
                    <SelectItem value="h3">
                        <div className="flex items-center gap-2">
                            <Heading3 className="h-4 w-4" /> Heading 3
                        </div>
                    </SelectItem>
                    <SelectItem value="quote">
                        <div className="flex items-center gap-2">
                            <Quote className="h-4 w-4" /> Quote
                        </div>
                    </SelectItem>
                    <SelectItem value="code">
                        <div className="flex items-center gap-2">
                            <Code className="h-4 w-4" /> Code Block
                        </div>
                    </SelectItem>
                    <SelectItem value="ul">
                        <div className="flex items-center gap-2">
                            <List className="h-4 w-4" /> Bullet List
                        </div>
                    </SelectItem>
                    <SelectItem value="ol">
                        <div className="flex items-center gap-2">
                            <ListOrdered className="h-4 w-4" /> Numbered List
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Font Size */}
            <div className="flex items-center gap-0.5 bg-background border border-input rounded-md overflow-hidden">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none border-r border-input"
                    onClick={() => applyFontSize(Math.max(8, fontSize - 1))}
                >
                    <Minus className="h-3 w-3" />
                </Button>
                <Input
                    type="text"
                    value={fontSizeInput}
                    onChange={(e) => {
                        const val = e.target.value;
                        setFontSizeInput(val);
                        const size = parseInt(val);
                        if (!isNaN(size) && size > 0 && size <= 144) {
                            applyFontSize(size);
                        }
                    }}
                    onBlur={() => {
                        setFontSizeInput(fontSize.toString());
                    }}
                    className="w-10 h-8 border-none bg-transparent text-center text-xs font-medium tabular-nums p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none border-l border-input"
                    onClick={() => applyFontSize(Math.min(144, fontSize + 1))}
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Text Formatting */}
            <ToolbarButton
                onClick={() => formatText("bold")}
                isActive={isBold}
                tooltip="Bold (Ctrl+B)"
            >
                <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => formatText("italic")}
                isActive={isItalic}
                tooltip="Italic (Ctrl+I)"
            >
                <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => formatText("underline")}
                isActive={isUnderline}
                tooltip="Underline (Ctrl+U)"
            >
                <Underline className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => formatText("code")}
                isActive={isCode}
                tooltip="Inline Code"
            >
                <Code className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertLink} isActive={isLink} tooltip="Insert Link">
                <Link2 className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Alignment */}
            <ToolbarButton onClick={() => formatElement("left")} tooltip="Align Left">
                <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => formatElement("center")} tooltip="Align Center">
                <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => formatElement("right")} tooltip="Align Right">
                <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => formatElement("justify")} tooltip="Justify">
                <AlignJustify className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Insert Image (placeholder) */}
            <ToolbarButton
                onClick={() => alert("Image upload coming soon!")}
                tooltip="Insert Image"
            >
                <ImagePlus className="h-4 w-4" />
            </ToolbarButton>
        </div>
    );
};

// Main Editor Component
export default function LexicalEditor({
    initialState,
    onChange,
}: {
    initialState?: string;
    onChange: (editorState: string, htmlStr: string) => void;
}) {
    const initialConfig: ComponentProps<typeof LexicalComposer>["initialConfig"] = {
        namespace: "BlogEditor",
        theme,
        onError(error: Error) {
            console.error("Lexical Error:", error);
        },
        nodes: [
            HeadingNode,
            ListNode,
            ListItemNode,
            QuoteNode,
            CodeNode,
            CodeHighlightNode,
            TableNode,
            TableCellNode,
            TableRowNode,
            AutoLinkNode,
            LinkNode,
        ],
        editorState: initialState || undefined,
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="w-full">
                <ToolbarPlugin />
                <div className="relative min-h-[400px] p-4 bg-card border border-border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable className="min-h-[350px] outline-none text-foreground leading-relaxed" />
                        }
                        placeholder={<Placeholder />}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                    <OnChangePlugin
                        onChange={(editorState) => {
                            editorState.read(() => {
                                const jsonString = JSON.stringify(editorState);
                                onChange(jsonString, "");
                            });
                        }}
                    />
                </div>
            </div>
        </LexicalComposer>
    );
}
