import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Header,
  HeaderContainer,
  HeaderMenuButton,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SkipToContent,
  Content,
  SideNav,
  SideNavItems,
  HeaderSideNavItems
} from '@carbon/react'
import { ChatBot } from '@carbon/icons-react'
import { useUiStore } from '../state/uiStore'
import { TaskDetailPanel } from './TaskDetailPanel'
import { AgentChatPanel } from './AgentChatPanel'

interface HeaderContainerRenderProps {
  isSideNavExpanded: boolean
  onClickSideNavExpand: () => void
}

const NAV_ITEMS = [
  { path: '/', label: 'Today' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/gantt', label: 'Gantt' },
  { path: '/projects', label: 'Projects' },
  { path: '/settings', label: 'Settings' }
]

export function AppShell(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const toggleAgentPanel = useUiStore((state) => state.toggleAgentPanel)
  const agentPanelOpen = useUiStore((state) => state.agentPanelOpen)

  return (
    <HeaderContainer
      render={({ isSideNavExpanded, onClickSideNavExpand }: HeaderContainerRenderProps) => (
        <>
          <Header aria-label="Todo List">
            <SkipToContent />
            <HeaderMenuButton
              aria-label="Open menu"
              onClick={onClickSideNavExpand}
              isActive={isSideNavExpanded}
              isCollapsible
            />
            <HeaderName prefix="" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              Todo List
            </HeaderName>
            <HeaderNavigation aria-label="Todo List">
              {NAV_ITEMS.map((item) => (
                <HeaderMenuItem
                  key={item.path}
                  isActive={location.pathname === item.path}
                  isCurrentPage={location.pathname === item.path}
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(item.path)
                  }}
                  href={`#${item.path}`}
                >
                  {item.label}
                </HeaderMenuItem>
              ))}
            </HeaderNavigation>
            <HeaderGlobalBar>
              <HeaderGlobalAction
                aria-label="Toggle agent chat"
                isActive={agentPanelOpen}
                onClick={toggleAgentPanel}
                tooltipAlignment="end"
              >
                <ChatBot size={20} />
              </HeaderGlobalAction>
            </HeaderGlobalBar>
            <SideNav
              aria-label="Side navigation"
              expanded={isSideNavExpanded}
              isPersistent={false}
              onSideNavBlur={onClickSideNavExpand}
            >
              <SideNavItems>
                <HeaderSideNavItems>
                  {NAV_ITEMS.map((item) => (
                    <HeaderMenuItem
                      key={item.path}
                      isActive={location.pathname === item.path}
                      onClick={(event) => {
                        event.preventDefault()
                        onClickSideNavExpand()
                        navigate(item.path)
                      }}
                      href={`#${item.path}`}
                    >
                      {item.label}
                    </HeaderMenuItem>
                  ))}
                </HeaderSideNavItems>
              </SideNavItems>
            </SideNav>
          </Header>
          <Content id="main-content" className="app-shell__content">
            <Outlet />
          </Content>
          <TaskDetailPanel />
          <AgentChatPanel />
        </>
      )}
    />
  )
}
