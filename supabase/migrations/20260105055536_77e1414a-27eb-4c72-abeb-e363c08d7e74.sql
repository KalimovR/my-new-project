-- Create transliteration function for existing articles
CREATE OR REPLACE FUNCTION public.transliterate_to_latin(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
    result TEXT := '';
    ch TEXT;
    i INT;
BEGIN
    input_text := lower(input_text);
    FOR i IN 1..length(input_text) LOOP
        ch := substring(input_text FROM i FOR 1);
        result := result || CASE ch
            WHEN 'а' THEN 'a'
            WHEN 'б' THEN 'b'
            WHEN 'в' THEN 'v'
            WHEN 'г' THEN 'g'
            WHEN 'д' THEN 'd'
            WHEN 'е' THEN 'e'
            WHEN 'ё' THEN 'yo'
            WHEN 'ж' THEN 'zh'
            WHEN 'з' THEN 'z'
            WHEN 'и' THEN 'i'
            WHEN 'й' THEN 'y'
            WHEN 'к' THEN 'k'
            WHEN 'л' THEN 'l'
            WHEN 'м' THEN 'm'
            WHEN 'н' THEN 'n'
            WHEN 'о' THEN 'o'
            WHEN 'п' THEN 'p'
            WHEN 'р' THEN 'r'
            WHEN 'с' THEN 's'
            WHEN 'т' THEN 't'
            WHEN 'у' THEN 'u'
            WHEN 'ф' THEN 'f'
            WHEN 'х' THEN 'kh'
            WHEN 'ц' THEN 'ts'
            WHEN 'ч' THEN 'ch'
            WHEN 'ш' THEN 'sh'
            WHEN 'щ' THEN 'shch'
            WHEN 'ъ' THEN ''
            WHEN 'ы' THEN 'y'
            WHEN 'ь' THEN ''
            WHEN 'э' THEN 'e'
            WHEN 'ю' THEN 'yu'
            WHEN 'я' THEN 'ya'
            WHEN 'і' THEN 'i'
            WHEN 'ї' THEN 'yi'
            WHEN 'є' THEN 'ye'
            WHEN 'ґ' THEN 'g'
            ELSE ch
        END;
    END LOOP;
    RETURN result;
END;
$$;

-- Update all existing articles with transliterated slugs
UPDATE public.articles
SET slug = (
    SELECT 
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    public.transliterate_to_latin(title),
                    '[^a-z0-9\s-]', '', 'g'
                ),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        ) || '-' || to_hex(extract(epoch from created_at)::bigint)
)
WHERE slug ~ '[а-яёА-ЯЁіїєґІЇЄҐ]' OR slug LIKE '%\%%';