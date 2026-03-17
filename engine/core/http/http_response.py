from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\HttpResponse.java
# WARNING: Unresolved types: ClassicHttpResponse, EndpointDetails, HttpContext, HttpHeaders, IOException, SocketAddress, T, apache, core5, hc, http, org

from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class HttpResponse:
    status: Status | None = None
    headers: HttpHeaders | None = None
    body: T | None = None
    endpoint_detail: EndpointDetail | None = None
    request: HttpRequest | None = None

    @staticmethod
    def from(response: org.apache.hc.core5.http.HttpResponse, context: HttpContext) -> HttpResponse[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(http_response: ClassicHttpResponse, body: T, request: HttpRequest, context: HttpContext) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(status: Status) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(body: T) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(status: Status, body: T) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(status: Status, body: T, content_type: str) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java

    def content_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Status:
        c_o_n_t_i_n_u_e: Status = new Status(100, "Continue")
        s_w_i_t_c_h_i_n_g__p_r_o_t_o_c_o_l_s: Status = new Status(101, "Switching Protocols")
        p_r_o_c_e_s_s_i_n_g: Status = new Status(102, "Processing")
        e_a_r_l_y__h_i_n_t_s: Status = new Status(103, "Early Hints")
        o_k: Status = new Status(200, "Ok")
        c_r_e_a_t_e_d: Status = new Status(201, "Created")
        a_c_c_e_p_t_e_d: Status = new Status(202, "Accepted")
        n_o_n__a_u_t_h_o_r_i_t_a_t_i_v_e__i_n_f_o_r_m_a_t_i_o_n: Status = new Status(203, "Non-Authoritative Information")
        n_o__c_o_n_t_e_n_t: Status = new Status(204, "No Content")
        r_e_s_e_t__c_o_n_t_e_n_t: Status = new Status(205, "Reset Content")
        p_a_r_t_i_a_l__c_o_n_t_e_n_t: Status = new Status(206, "Partial Content")
        m_u_l_t_i__s_t_a_t_u_s: Status = new Status(207, "Multi Status")
        a_l_r_e_a_d_y__i_m_p_o_r_t_e_d: Status = new Status(208, "Already imported")
        i_m__u_s_e_d: Status = new Status(226, "IM Used")
        m_u_l_t_i_p_l_e__c_h_o_i_c_e_s: Status = new Status(300, "Multiple Choices")
        m_o_v_e_d__p_e_r_m_a_n_e_n_t_l_y: Status = new Status(301, "Moved Permanently")
        f_o_u_n_d: Status = new Status(302, "Found")
        s_e_e__o_t_h_e_r: Status = new Status(303, "See Other")
        n_o_t__m_o_d_i_f_i_e_d: Status = new Status(304, "Not Modified")
        u_s_e__p_r_o_x_y: Status = new Status(305, "Use Proxy")
        s_w_i_t_c_h__p_r_o_x_y: Status = new Status(306, "Switch Proxy")
        t_e_m_p_o_r_a_r_y__r_e_d_i_r_e_c_t: Status = new Status(307, "Temporary Redirect")
        p_e_r_m_a_n_e_n_t__r_e_d_i_r_e_c_t: Status = new Status(308, "Permanent Redirect")
        b_a_d__r_e_q_u_e_s_t: Status = new Status(400, "Bad Request")
        u_n_a_u_t_h_o_r_i_z_e_d: Status = new Status(401, "Unauthorized")
        p_a_y_m_e_n_t__r_e_q_u_i_r_e_d: Status = new Status(402, "Payment Required")
        f_o_r_b_i_d_d_e_n: Status = new Status(403, "Forbidden")
        n_o_t__f_o_u_n_d: Status = new Status(404, "Not Found")
        m_e_t_h_o_d__n_o_t__a_l_l_o_w_e_d: Status = new Status(405, "Method Not Allowed")
        n_o_t__a_c_c_e_p_t_a_b_l_e: Status = new Status(406, "Not Acceptable")
        p_r_o_x_y__a_u_t_h_e_n_t_i_c_a_t_i_o_n__r_e_q_u_i_r_e_d: Status = new Status(407, "Proxy Authentication Required")
        r_e_q_u_e_s_t__t_i_m_e_o_u_t: Status = new Status(408, "Request Timeout")
        c_o_n_f_l_i_c_t: Status = new Status(409, "Conflict")
        g_o_n_e: Status = new Status(410, "Gone")
        l_e_n_g_t_h__r_e_q_u_i_r_e_d: Status = new Status(411, "Length Required")
        p_r_e_c_o_n_d_i_t_i_o_n__f_a_i_l_e_d: Status = new Status(412, "Precondition Failed")
        r_e_q_u_e_s_t__e_n_t_i_t_y__t_o_o__l_a_r_g_e: Status = new Status(413, "Request Entity Too Large")
        r_e_q_u_e_s_t__u_r_i__t_o_o__l_o_n_g: Status = new Status(414, "Request-URI Too Long")
        u_n_s_u_p_p_o_r_t_e_d__m_e_d_i_a__t_y_p_e: Status = new Status(415, "Unsupported Media Type")
        r_e_q_u_e_s_t_e_d__r_a_n_g_e__n_o_t__s_a_t_i_s_f_i_a_b_l_e: Status = new Status(416, "Requested Range Not Satisfiable")
        e_x_p_e_c_t_a_t_i_o_n__f_a_i_l_e_d: Status = new Status(417, "Expectation Failed")
        i__a_m__a__t_e_a_p_o_t: Status = new Status(418, "I am a teapot")
        e_n_h_a_n_c_e__y_o_u_r__c_a_l_m: Status = new Status(420, "Enhance your calm")
        m_i_s_d_i_r_e_c_t_e_d__r_e_q_u_e_s_t: Status = new Status(421, "Misdirected Request")
        u_n_p_r_o_c_e_s_s_a_b_l_e__e_n_t_i_t_y: Status = new Status(422, "Unprocessable Entity")
        l_o_c_k_e_d: Status = new Status(423, "Locked")
        f_a_i_l_e_d__d_e_p_e_n_d_e_n_c_y: Status = new Status(424, "Failed Dependency")
        t_o_o__e_a_r_l_y: Status = new Status(425, "Too Early")
        u_p_g_r_a_d_e__r_e_q_u_i_r_e_d: Status = new Status(426, "Upgrade Required")
        p_r_e_c_o_n_d_i_t_i_o_n__r_e_q_u_i_r_e_d: Status = new Status(428, "Precondition Required")
        t_o_o__m_a_n_y__r_e_q_u_e_s_t_s: Status = new Status(429, "Too Many Requests")
        r_e_q_u_e_s_t__h_e_a_d_e_r__f_i_e_l_d_s__t_o_o__l_a_r_g_e: Status = new Status(431, "Request Header Fields Too Large")
        n_o__r_e_s_p_o_n_s_e: Status = new Status(444, "No Response")
        b_l_o_c_k_e_d__b_y__w_i_n_d_o_w_s__p_a_r_e_n_t_a_l__c_o_n_t_r_o_l_s: Status = new Status(450, "Blocked by Windows Parental Controls")
        u_n_a_v_a_i_l_a_b_l_e__f_o_r__l_e_g_a_l__r_e_a_s_o_n_s: Status = new Status(451, "Unavailable For Legal Reasons")
        r_e_q_u_e_s_t__h_e_a_d_e_r__t_o_o__l_a_r_g_e: Status = new Status(494, "Request Header Too Large")
        i_n_t_e_r_n_a_l__s_e_r_v_e_r__e_r_r_o_r: Status = new Status(500, "Internal Server Error")
        n_o_t__i_m_p_l_e_m_e_n_t_e_d: Status = new Status(501, "Not Implemented")
        b_a_d__g_a_t_e_w_a_y: Status = new Status(502, "Bad Gateway")
        s_e_r_v_i_c_e__u_n_a_v_a_i_l_a_b_l_e: Status = new Status(503, "Service Unavailable")
        g_a_t_e_w_a_y__t_i_m_e_o_u_t: Status = new Status(504, "Gateway Timeout")
        h_t_t_p__v_e_r_s_i_o_n__n_o_t__s_u_p_p_o_r_t_e_d: Status = new Status(505, "HTTP Version Not Supported")
        v_a_r_i_a_n_t__a_l_s_o__n_e_g_o_t_i_a_t_e_s: Status = new Status(506, "Variant Also Negotiates")
        i_n_s_u_f_f_i_c_i_e_n_t__s_t_o_r_a_g_e: Status = new Status(507, "Insufficient Storage")
        l_o_o_p__d_e_t_e_c_t_e_d: Status = new Status(508, "Loop Detected")
        b_a_n_d_w_i_d_t_h__l_i_m_i_t__e_x_c_e_e_d_e_d: Status = new Status(509, "Bandwidth Limit Exceeded")
        n_o_t__e_x_t_e_n_d_e_d: Status = new Status(510, "Not Extended")
        n_e_t_w_o_r_k__a_u_t_h_e_n_t_i_c_a_t_i_o_n__r_e_q_u_i_r_e_d: Status = new Status(511, "Network Authentication Required")
        c_o_n_n_e_c_t_i_o_n__t_i_m_e_d__o_u_t: Status = new Status(522, "Connection Timed Out")
        code: int | None = None
        reason: str | None = None

        @staticmethod
        def value_of(code: int) -> Status:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EndpointDetail:
        remote_address: SocketAddress | None = None
        local_address: SocketAddress | None = None
        request_count: int | None = None
        response_count: int | None = None
        sent_bytes_count: int | None = None
        received_bytes_count: int | None = None

        @staticmethod
        def from(details: EndpointDetails) -> EndpointDetail:
            raise NotImplementedError  # TODO: translate from Java
