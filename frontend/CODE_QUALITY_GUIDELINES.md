# 前端代码质量指南与常见错误总结

本文档总结了在项目开发过程中遇到的常见错误和最佳实践，以帮助避免重复犯同样的错误。

## API 相关

### 常见错误

1. **URL 格式错误**
   - 问题：后端 API 路径末尾不包含斜杠，但前端请求添加了斜杠，导致 307 重定向
   - 解决：确保前端 API 路径与后端完全匹配，特别是末尾斜杠的处理

2. **响应数据结构处理不当**
   - 问题：假设响应总是特定格式（如 `response.data.results`），而实际可能是 `response.data` 直接就是数组
   - 解决：处理多种可能的响应格式，进行适当的类型检查和兼容处理

3. **错误处理不完善**
   - 问题：只处理基本错误情况，忽略特定状态码或网络问题
   - 解决：全面处理 HTTP 状态码、网络错误和后端返回的错误消息

4. **授权处理问题**
   - 问题：不正确处理 token 过期或未登录状态
   - 解决：实现统一的授权拦截器，处理 401 错误并重定向到登录页面

### 最佳实践

1. **使用拦截器统一处理请求/响应**
   ```typescript
   apiClient.interceptors.request.use(config => {
     // 添加 token 等通用逻辑
     return config;
   });
   
   apiClient.interceptors.response.use(response => {
     return response;
   }, error => {
     // 统一错误处理
     if (error.response?.status === 401) {
       // 处理未授权
     }
     return Promise.reject(error);
   });
   ```

2. **将 API 调用封装在服务层**
   - 将所有 API 调用集中在服务文件中，而不是在组件内直接调用
   - 使用适配器模式处理后端数据与前端模型之间的差异

3. **添加详细的日志**
   ```typescript
   try {
     console.log('发送请求:', endpoint, data);
     const response = await apiClient.post(endpoint, data);
     console.log('响应数据:', response.data);
     return response.data;
   } catch (error) {
     console.error('请求失败:', error);
     // 更多错误处理...
     throw error;
   }
   ```

## 类型安全

### 常见错误

1. **后端与前端模型不匹配**
   - 问题：前端使用的字段名（如 `status`）与后端返回的字段（如 `processing_status`）不一致
   - 解决：创建适配器函数，转换后端数据到前端模型

2. **未处理空值或可选字段**
   - 问题：假设某个字段一定存在，导致运行时错误
   - 解决：使用可选链、默认值和适当的类型检查

3. **ID 类型处理错误**
   - 问题：在不同地方对 ID 类型的处理不一致（字符串 vs 数字）
   - 解决：统一使用一种类型，需要转换时显式处理

### 最佳实践

1. **定义清晰的接口和类型**
   ```typescript
   // 后端返回的原始类型
   interface BackendDocument {
     id: number;
     processing_status: string;
     content_type: string;
     // 其他字段...
   }
   
   // 前端使用的类型
   interface Document {
     id: number;
     status: 'pending' | 'processing' | 'completed' | 'failed';
     file_type: string;
     // 其他字段...
   }
   
   // 适配函数
   const adaptDocument = (doc: BackendDocument): Document => {
     return {
       id: doc.id,
       status: mapStatus(doc.processing_status),
       file_type: doc.content_type,
       // 其他字段转换...
     };
   };
   ```

2. **处理可选值和默认值**
   ```typescript
   // 安全地访问嵌套属性
   const count = response.data?.index_stats?.vector_count ?? 0;
   
   // 确保 ID 总是数字
   const docId = typeof id === 'string' ? parseInt(id, 10) : id;
   ```

3. **使用类型守卫确保类型安全**
   ```typescript
   function isDocument(obj: any): obj is Document {
     return obj && typeof obj.id === 'number' && typeof obj.title === 'string';
   }
   
   if (isDocument(data)) {
     // 安全地使用 Document 类型的属性
   }
   ```

## 组件和状态管理

### 常见错误

1. **重复创建函数**
   - 问题：每次渲染时重新创建回调函数，导致不必要的渲染和依赖变化
   - 解决：使用 `useCallback` 和 `useMemo`

2. **依赖数组缺失或冗余**
   - 问题：`useEffect` 或 `useCallback` 的依赖数组处理不当
   - 解决：确保依赖数组包含所有使用的值，并避免引入不必要的依赖

3. **过早优化**
   - 问题：不必要的过早优化导致代码复杂度增加
   - 解决：优先考虑代码清晰度，在性能成为实际问题时再优化

### 最佳实践

1. **合理使用 React Hooks**
   ```typescript
   // 包装回调函数避免重新创建
   const handleSearch = useCallback(() => {
     // 搜索逻辑...
   }, [searchQuery, searchType]); // 只包含真正的依赖
   
   // 缓存计算结果
   const filteredData = useMemo(() => {
     return data.filter(item => item.title.includes(searchTerm));
   }, [data, searchTerm]);
   ```

2. **状态分组**
   ```typescript
   // 避免过多的单独状态
   const [searchState, setSearchState] = useState({
     query: '',
     type: 'keyword',
     isLoading: false,
     results: []
   });
   
   // 更新状态的一部分
   setSearchState(prev => ({
     ...prev,
     isLoading: true
   }));
   ```

3. **使用自定义 Hook 提取复杂逻辑**
   ```typescript
   function useSearch() {
     const [state, setState] = useState({...});
     
     const search = useCallback(async (query) => {
       // 搜索逻辑...
     }, []);
     
     return { ...state, search };
   }
   
   // 使用自定义 Hook
   const { results, isLoading, search } = useSearch();
   ```

## 路由处理

### 常见错误

1. **路由配置冲突**
   - 问题：多级路由嵌套不当，导致路径冲突或页面不显示
   - 解决：确保路由层次结构清晰，避免重复或冲突的路径

2. **硬编码路由路径**
   - 问题：在多处硬编码路由路径，导致修改困难且容易出错
   - 解决：集中定义路由路径常量，统一管理

3. **忽略 URL 参数类型**
   - 问题：直接使用 URL 参数而不进行验证或转换
   - 解决：明确处理参数类型转换并进行验证

### 最佳实践

1. **集中定义路由配置**
   ```typescript
   // routes.ts
   export const ROUTES = {
     HOME: '/',
     LOGIN: '/login',
     DOCUMENTS: '/documents',
     DOCUMENT_DETAIL: (id: number) => `/documents/${id}`,
     DOCUMENT_SEARCH: '/documents/search'
   };
   
   // 使用示例
   navigate(ROUTES.DOCUMENT_DETAIL(documentId));
   ```

2. **正确处理 URL 参数**
   ```typescript
   const { documentId } = useParams();
   
   // 确保转换为正确的类型
   const id = documentId ? parseInt(documentId, 10) : undefined;
   
   // 验证参数有效性
   useEffect(() => {
     if (!id || isNaN(id)) {
       navigate('/not-found');
     }
   }, [id, navigate]);
   ```

3. **使用 React Router 的高级功能**
   ```typescript
   // 嵌套路由示例
   <Routes>
     <Route path="/" element={<Layout />}>
       <Route index element={<HomePage />} />
       <Route path="documents" element={<DocumentsLayout />}>
         <Route index element={<DocumentsList />} />
         <Route path=":id" element={<DocumentDetail />} />
       </Route>
     </Route>
   </Routes>
   ```

## 调试与错误处理

### 常见错误

1. **缺少调试日志**
   - 问题：出现错误时没有足够的信息定位问题
   - 解决：在关键位置添加详细的日志记录

2. **错误状态处理不完善**
   - 问题：没有全面考虑错误状态，导致用户体验差
   - 解决：实现友好的错误状态显示和恢复机制

3. **忽略边缘情况**
   - 问题：只考虑主要流程，忽略加载状态、空数据、错误情况等
   - 解决：全面考虑各种状态，提供适当的反馈

### 最佳实践

1. **全面的错误边界**
   ```typescript
   <ErrorBoundary fallback={<ErrorDisplay />}>
     <ComponentThatMightError />
   </ErrorBoundary>
   ```

2. **详细的日志记录**
   ```typescript
   // 接口调用前
   console.log('开始搜索:', { query, type });
   
   // 接口调用后
   console.log('搜索结果:', results);
   
   // 错误处理
   console.error('搜索失败:', error);
   if (error.response) {
     console.error('响应状态:', error.response.status);
     console.error('响应数据:', error.response.data);
   }
   ```

3. **友好的加载和错误状态**
   ```tsx
   {isLoading && <LoadingSpinner />}
   
   {error && (
     <ErrorMessage 
       message={error} 
       onRetry={() => handleRetry()} 
     />
   )}
   
   {!isLoading && !error && data.length === 0 && (
     <EmptyState message="没有找到结果" />
   )}
   ```

## 样式和 UI

### 常见错误

1. **不一致的样式命名**
   - 问题：混合使用不同的命名约定，导致难以维护
   - 解决：遵循统一的命名约定（如 BEM 或 Tailwind 约定）

2. **硬编码值**
   - 问题：在多处硬编码颜色、尺寸等值
   - 解决：使用主题变量或设计令牌系统

3. **响应式设计不完善**
   - 问题：没有充分考虑不同屏幕尺寸
   - 解决：使用响应式设计模式，测试多种屏幕尺寸

### 最佳实践

1. **使用设计系统组件**
   - 优先使用设计系统中的通用组件，而不是创建特定用途的组件
   - 确保设计一致性和可维护性

2. **主题变量**
   ```css
   :root {
     --color-primary: #3b82f6;
     --color-error: #ef4444;
     --spacing-base: 1rem;
   }
   
   .button {
     background-color: var(--color-primary);
     padding: var(--spacing-base);
   }
   ```

3. **使用响应式工具类**
   ```html
   <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
     <!-- 内容会根据屏幕尺寸自动调整列数 -->
   </div>
   ```

---

遵循这些指南和最佳实践，可以帮助我们避免常见错误，提高代码质量，并创建更可靠的应用程序。随着项目的发展，我们将不断更新这个文档，加入新的经验教训和最佳实践。 