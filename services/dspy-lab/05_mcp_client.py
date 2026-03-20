"""
MCP integration: connect to an MCP server and use its tools with dspy.ReAct.
Supports both HTTP (remote) and stdio (local process) transports.
"""

import asyncio
import dspy
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# For HTTP servers, also import:
# from mcp.client.streamable_http import streamablehttp_client


# -- Stdio transport (local MCP server) ----------------------------------

async def run_with_stdio_server():
    server_params = StdioServerParameters(
        command="python",
        args=["path/to/your/mcp_server.py"],
        env=None,
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            response = await session.list_tools()
            dspy_tools = [
                dspy.Tool.from_mcp_tool(session, tool)
                for tool in response.tools
            ]
            print(f"Loaded {len(dspy_tools)} tools from MCP server")

            react = dspy.ReAct(
                signature="question: str -> answer: str",
                tools=dspy_tools,
                max_iters=5,
            )

            result = await react.acall(question="What is 25 + 17?")
            print("Answer:", result.answer)


# -- HTTP transport (remote MCP server) ----------------------------------

# async def run_with_http_server():
#     async with streamablehttp_client("http://localhost:8000/mcp") as (read, write):
#         async with ClientSession(read, write) as session:
#             await session.initialize()
#             response = await session.list_tools()
#             dspy_tools = [
#                 dspy.Tool.from_mcp_tool(session, tool)
#                 for tool in response.tools
#             ]
#             react = dspy.ReAct(
#                 signature="task: str -> result: str",
#                 tools=dspy_tools,
#                 max_iters=5,
#             )
#             result = await react.acall(task="Check the weather in Tokyo")
#             print("Result:", result.result)


# -- Run ------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(run_with_stdio_server())
