// SCSS Modules类型声明
declare module '*.module.scss' {
  const styles: Record<string, string>
  export default styles
}

declare module '*.module.css' {
  const styles: Record<string, string>
  export default styles
}

// 构建注入的全局常量
declare const API_BASE_URL: string
