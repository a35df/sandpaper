ALTER TABLE paragraphs
ADD COLUMN content_history TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN applied_card_history UUID[] DEFAULT ARRAY[]::UUID[];
