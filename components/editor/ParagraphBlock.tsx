import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Paragraph } from '@/types';
import { Reorder, useDragControls, motion, useMotionValue, useTransform } from 'framer-motion';
import { GripVertical, Sparkles } from 'lucide-react';
import { useCardStore } from '@/lib/store';

interface ParagraphBlockProps {
  paragraph: Paragraph;
  isEditable: boolean;
  onGenerateCards: () => void;
  onDrop: (paragraphId: string) => void;
  isCardDragging: boolean;
  onAddParagraph: () => void;
  onAddDescription: (paragraphId: string) => void;
  onUndo: (paragraphId: string) => void;
  onIconTap: () => void;
  onFocused?: () => void;
}

import { useEffect, useRef } from 'react';

// window에 __tiptap_editors 타입 선언 (TS 오류 방지)
declare global {
  interface Window {
    __tiptap_editors?: any[];
  }
}
const ParagraphBlock = ({
  paragraph,
  isEditable,
  onGenerateCards,
  onDrop,
  isCardDragging,
  onAddParagraph,
  onFocused,
  onAddDescription,
  onUndo,
  onIconTap,
}: ParagraphBlockProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: paragraph.content,
    editable: isEditable,
    editorProps: {
      handleKeyDown(view, event) {
        if (!isEditable) return false;
        // Shift+Enter: 줄바꿈만 허용
        if (event.key === 'Enter' && event.shiftKey) {
          return false; // 기본 줄바꿈
        }
        // Enter: 새 블록 생성 및 커서 이동
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onAddParagraph();
          return true;
        }
        return false;
      },
    },
  });

  // TipTap editor를 window.__tiptap_editors에 등록 (전체 선택용)
  useEffect(() => {
    if (!window.__tiptap_editors) window.__tiptap_editors = [];
    if (editor && !window.__tiptap_editors.includes(editor)) {
      window.__tiptap_editors.push(editor);
    }
    return () => {
      if (window.__tiptap_editors && editor) {
        window.__tiptap_editors = window.__tiptap_editors.filter((ed: any) => ed !== editor);
      }
    };
  }, [editor]);

  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const backgroundOpacity = useTransform(x, [0, 200], [0, 0.7);
  const iconOpacity = useTransform(x, [100, 200], [0, 1]);

  // 제스처 감지를 위한 Refs
  const scrubGestures = useRef(0);
  const lastDragDirection = useRef(0);
  const dragStartTime = useRef(0);

  // 롱프레스 관련
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = false;
    startX.current = e.clientX;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = setTimeout(() => {
      // x 이동량이 거의 없고, 드래그 중이 아닐 때만 커서 진입
      if (!isDragging.current && Math.abs(x.get()) < 10 && editor && isEditable) {
        editor.commands.focus('end');
      }
    }, 500); // 500ms 롱프레스
  };

  const handlePointerUp = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (Math.abs(e.clientX - startX.current) > 10) {
      isDragging.current = true;
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    }
  };

  const handleDragStart = () => {
    // 드래그 시작 시 제스처 정보 초기화
    scrubGestures.current = 0;
    lastDragDirection.current = 0;
    dragStartTime.current = Date.now();
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    // 드래그 중 방향 전환 감지
    const currentDirection = Math.sign(info.velocity.x);
    if (currentDirection !== 0 && currentDirection !== lastDragDirection.current) {
      scrubGestures.current++;
      lastDragDirection.current = currentDirection;
    }
  };

  const handleDragEnd = (event: any, info: { offset: { x: number; y: number } }) => {
    const dragDuration = Date.now() - dragStartTime.current;

    // 1. 되돌리기 제스처(스크럽) 확인
    // 1.5초 안에 3번 이상 방향이 바뀌었는지 확인
    if (dragDuration < 1500 && scrubGestures.current >= 3) {
      onUndo(paragraph.id);
      return; // 다른 액션 방지
    }

    // 2. 기존의 스와이프 액션 확인
    if (info.offset.x > 200) {
      onGenerateCards(); // 오른쪽 스와이프: 자료 조사
    } else if (info.offset.x < -200 && typeof onAddDescription === 'function') {
      onAddDescription(paragraph.id); // 왼쪽 스와이프: 묘사 추가
    }
  };

  return (
    <motion.div
      onMouseUp={() => onDrop(paragraph.id)} // 마우스 버튼을 떼었을 때 paragraph.id와 함께 onDrop 호출
      className="relative"
    >
      <Reorder.Item
        value={paragraph}
        dragListener={false}
        dragControls={dragControls}
        className="relative"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <motion.div
          className="absolute inset-0 bg-indigo-600 rounded-md pointer-events-none"
          style={{ opacity: backgroundOpacity }}
        />
        {isCardDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-indigo-400 rounded-md pointer-events-none animate-pulse" />
        )}
        <motion.div
          className="absolute right-6 top-0 bottom-0 flex items-center pointer-events-none"
          style={{ opacity: iconOpacity }}
        >
          <Sparkles className="h-6 w-6 text-white" />
        </motion.div>
        <div className="relative flex items-center gap-2 p-2 rounded-md hover:bg-gray-800/50 transition-colors">
          <div className="cursor-grab active:cursor-grabbing z-10">
            <GripVertical className="h-5 w-5 text-gray-500" />
          </div>
          <div className="flex-grow bg-transparent">
            <EditorContent editor={editor} />
          </div>
          {paragraph.applied_card_history && paragraph.applied_card_history.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // 드래그 방지
                onIconTap();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-indigo-500 rounded-full cursor-pointer hover:bg-indigo-400 z-20"
            >
              <span className="text-white text-xs font-bold">{paragraph.applied_card_history.length}</span>
            </button>
          )}
        </div>
      </Reorder.Item>
    </motion.div>
  );
};

export default ParagraphBlock;

