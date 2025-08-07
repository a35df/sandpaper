// components/layout/GestureManager.tsx
'use client';

import { useUIStore } from '@/lib/uiStore';
import { motion, PanInfo } from 'framer-motion';

const GestureManager = () => {
  const { openEpisodePanel, openReferencePanel } = useUIStore();

  const handlePanEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const { innerWidth, innerHeight } = window;

    const startX = event instanceof MouseEvent ? event.clientX - offset.x : 0;
    const startY = event instanceof MouseEvent ? event.clientY - offset.y : 0;

    // 제스처 감지 조건 (속도, 거리, 시작 위치)
    const minVelocity = 500;
    const minDistance = 100;

    // 좌상단 -> 우하단
    if (
      startX < innerWidth * 0.25 &&
      startY < innerHeight * 0.25 &&
      offset.x > minDistance &&
      offset.y > minDistance &&
      velocity.x > minVelocity &&
      velocity.y > minVelocity
    ) {
      openEpisodePanel();
    }

    // 좌하단 -> 우상단
    if (
      startX < innerWidth * 0.25 &&
      startY > innerHeight * 0.75 &&
      offset.x > minDistance &&
      offset.y < -minDistance &&
      velocity.x > minVelocity &&
      velocity.y < -minVelocity
    ) {
      openReferencePanel();
    }
  };

  return (
    <motion.div
      onPanEnd={handlePanEnd}
      className="fixed inset-0 z-0" // 화면 전체를 덮지만, 다른 UI를 막지 않도록 z-index 낮춤
      style={{ pointerEvents: 'auto' }} // 제스처 이벤트를 받기 위해 필요
    />
  );
};

export default GestureManager;
