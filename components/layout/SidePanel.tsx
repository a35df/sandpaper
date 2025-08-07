'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidePanelProps {
  position: 'left' | 'right';
  children: ReactNode;
  isOpen: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const SidePanel = ({ position, children, isOpen, onOpen, onClose }: SidePanelProps) => {

  const variants = {
    hidden: { 
      x: position === 'left' ? '-100%' : '100%',
      transition: { type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }
    },
    visible: { 
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
  };

  return (
    <>
      {/* 패널을 열기 위한 호버 영역 */}
      <div
        onMouseEnter={onOpen}
        className={`fixed top-0 h-full w-10 ${position === 'left' ? 'left-0 z-50' : 'right-0 left-auto z-60'}`}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            className={`fixed top-0 ${position}-0 h-full w-80 bg-gray-950/80 backdrop-blur-md shadow-2xl ${position === 'left' ? 'border-r-gray-800' : 'border-l-gray-800'} border-l border-r ${isOpen ? 'z-[999]' : (position === 'left' ? 'z-40' : 'z-70')}`}
            onMouseLeave={onClose}
          >
            <div className="p-4 h-full overflow-y-auto">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidePanel;

