import { useEffect } from "react"
import { IS_DEMO_MODE } from "../lib/supabase"
import { PRODUCT } from "../product"

export function ProductHeader() {
  const name = PRODUCT.name || "[제품 이름]"
  const concept = PRODUCT.concept || "[제품 컨셉, 한 줄]"
  const description = PRODUCT.description || "[제품 설명, 2~3문장]"

  useEffect(() => {
    document.title = PRODUCT.name || "[제품 이름]"
  }, [])

  return (
    <header className="product-header">
      <p className={`t-display ${PRODUCT.name ? "" : "is-placeholder"}`}>
        {name}
      </p>
      <p className={`t-label ${PRODUCT.concept ? "" : "is-placeholder"}`}>
        {concept}
      </p>
      <p className={`t-body ${PRODUCT.description ? "" : "is-placeholder"}`}>
        {description}
      </p>
      {IS_DEMO_MODE && (
        <p className="t-caption demo-message">데모 데이터로 표시 중</p>
      )}
    </header>
  )
}
