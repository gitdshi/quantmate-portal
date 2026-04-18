import SourceCatalogTab from './SourceCatalogTab'

export default function AkshareTab() {
  return (
    <SourceCatalogTab
      source="akshare"
      sourceName="AkShare"
      titleKey="akshare.title"
      defaultTitle="AkShare 接口目录"
      descriptionKey="page.datasource.akshareDesc"
      defaultDescription="指数与宏观经济数据"
      loadingKey="akshare.loading"
      defaultLoading="加载 AkShare 目录..."
      fallbackCategoryLabel="AkShare"
    />
  )
}