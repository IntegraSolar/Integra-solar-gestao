/**
 * Layout raiz do backoffice.
 *
 * O app dos clientes (tenant) usa data-theme="green" no <html>, que traz um
 * grande bloco de overrides globais em globals.css (remapeia .text-white para
 * cores escuras, etc.). Esses overrides vazam para o backoffice e deixam o
 * texto dos botões ilegível.
 *
 * O backoffice tem paleta própria (cores explícitas), então forçamos um tema
 * neutro ("light") — que não possui nenhum desses overrides — antes da pintura.
 * Não gravamos no localStorage: a preferência de tema do usuário no app do
 * cliente é preservada.
 */
export default function BackofficeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute('data-theme','light')`,
        }}
      />
      {children}
    </>
  )
}
