/**
 * e2e 테스트용 환경변수. 테스트 파일보다 먼저 실행된다(jest setupFiles).
 *
 * 개발용 DB(cgate)가 아니라 cgate_test를 보게 만든다. 테스트는 테이블을
 * 통째로 비우므로, 이걸 빠뜨리면 로컬 개발 데이터가 날아간다.
 * e2eApp.ts의 resetDatabase가 DB 이름을 한 번 더 확인한다.
 *
 * dotenv는 이미 있는 process.env 값을 덮어쓰지 않으므로 여기서 정한 값이 이긴다.
 * 접속 정보(host·user·password)는 .env에서 그대로 가져다 쓴다 — 여기에
 * 하드코딩하면 팀원마다 다른 로컬 비밀번호와 어긋난다.
 */
process.env.DB_DATABASE = 'cgate_test';

/**
 * StubAuthGuard는 이 플래그가 명시적으로 켜져야 동작한다(기본 꺼짐).
 * 켜지 않으면 모든 요청이 401이라 테스트가 통째로 실패한다.
 */
process.env.STUB_AUTH_ENABLED = 'true';
