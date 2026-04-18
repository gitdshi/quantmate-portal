import SourceCatalogTab from './SourceCatalogTab'

export default function TushareProTab() {
  return (
    <SourceCatalogTab
      source="tushare"
      sourceName="Tushare Pro"
      titleKey="tushare.title"
      defaultTitle="Tushare Pro 接口目录"
      descriptionKey="page.datasource.tushareDesc"
      defaultDescription="A 股日线、财务、资金流等数据"
      loadingKey="tushare.loading"
      defaultLoading="加载 Tushare Pro 目录..."
      fallbackCategoryLabel="其他"
    />
  )
}
