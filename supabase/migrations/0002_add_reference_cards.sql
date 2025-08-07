-- 참조 카드 테이블 생성
CREATE TABLE reference_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 사용자 인증 구현 시 주석 해제
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    "group" TEXT,
    is_in_hold BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 트리거 적용
CREATE TRIGGER set_reference_cards_timestamp
BEFORE UPDATE ON reference_cards
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- RLS 활성화 및 정책 생성
ALTER TABLE reference_cards ENABLE ROW LEVEL SECURITY;

-- (임시) 모든 사용자가 접근 가능하도록 설정
CREATE POLICY "Public reference_cards are viewable by everyone." ON reference_cards FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reference_cards." ON reference_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reference_cards." ON reference_cards FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reference_cards." ON reference_cards FOR DELETE USING (true);
